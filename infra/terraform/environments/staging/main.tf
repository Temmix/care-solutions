locals {
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

# ── VPC (no NAT Gateway — saves $32/month) ────────────

module "vpc" {
  source = "../../modules/vpc"

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr               = "10.3.0.0/16"
  availability_zones     = local.availability_zones
  enable_nat_gateway     = false
  flow_log_retention_days = 7
}

# ── KMS ─────────────────────────────────────────────────

module "kms" {
  source = "../../modules/kms"

  project_name = var.project_name
  environment  = var.environment
}

# ── ECR (shared with production) ────────────────────────

module "ecr" {
  source = "../../modules/ecr"

  project_name     = var.project_name
  environment      = var.environment
  repository_names = ["care-api-staging", "care-web-staging", "care-seed"]
}

# ── RDS (smallest instance, no monitoring) ──────────────

module "rds" {
  source = "../../modules/rds"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  app_security_group_id      = module.ecs.task_security_group_id
  kms_key_arn                = module.kms.key_arn

  engine_version             = "16.6"
  instance_class             = "db.t3.micro"
  allocated_storage          = 20
  max_allocated_storage      = 20
  multi_az                   = false
  deletion_protection        = false
  backup_retention_days      = 1
  master_password            = var.db_password
  monitoring_interval        = 0
  performance_insights_enabled = false
}

# ── ALB ─────────────────────────────────────────────────

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = ""
  enable_https      = false
}

# ── Secrets Manager ─────────────────────────────────────

module "secrets_manager" {
  source = "../../modules/secrets-manager"

  project_name          = var.project_name
  environment           = var.environment
  kms_key_arn           = module.kms.key_arn
  database_url          = "postgresql://care_admin:${var.db_password}@${module.rds.address}:${module.rds.port}/${module.rds.database_name}?sslmode=require"
  jwt_secret            = var.jwt_secret
  encryption_master_key = var.encryption_master_key
  stripe_secret_key     = var.stripe_secret_key
  stripe_webhook_secret = var.stripe_webhook_secret
}

# ── ECS Fargate (public subnets, smallest sizes) ───────

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.public_subnet_ids  # Use public subnets (no NAT)
  assign_public_ip      = true                          # Required for public subnet Fargate
  alb_security_group_id = module.alb.security_group_id
  api_target_group_arn  = module.alb.api_target_group_arn
  web_target_group_arn  = module.alb.web_target_group_arn
  secret_arn            = module.secrets_manager.secret_arn
  kms_key_arn           = module.kms.key_arn

  api_cpu           = 256    # 0.25 vCPU
  api_memory        = 512    # 0.5 GB
  api_desired_count = 1
  api_max_count     = 1      # No autoscaling

  web_cpu           = 256    # 0.25 vCPU
  web_memory        = 512    # 0.5 GB
  web_desired_count = 1
  web_max_count     = 1      # No autoscaling

  log_retention_days = 7
}

# ── Route53 ───────────────────────────────────────────────

module "route53" {
  source = "../../modules/route53"

  project_name     = var.project_name
  environment      = var.environment
  domain_name      = var.domain_name
  alb_dns_name     = module.alb.alb_dns_name
  alb_zone_id      = module.alb.alb_zone_id
}

# ── SES (email sending + domain verification) ────────────

module "ses" {
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  zone_id      = module.route53.zone_id
}

# ── GitHub Actions IAM (OIDC) ──────────────────────────

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-${var.environment}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_ecr" {
  name = "${var.project_name}-${var.environment}-github-ecr"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["ecr:GetAuthorizationToken"]
        Resource = ["*"]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
        ]
        Resource = values(module.ecr.repository_arns)
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:DeregisterTaskDefinition",
          "ecs:RunTask",
          "iam:PassRole",
          "logs:GetLogEvents",
          "logs:FilterLogEvents",
        ]
        Resource = ["*"]
      },
    ]
  })
}
