locals {
  # 2 AZs only (minimum for ALB)
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]

  # All domains: primary + additional
  all_domains = concat([var.domain_name], var.additional_domains)
}

# ── VPC (2 AZs, 1 NAT Gateway) ─────────────────────────

module "vpc" {
  source = "../../modules/vpc"

  project_name           = var.project_name
  environment            = var.environment
  vpc_cidr                = "10.2.0.0/16"
  availability_zones      = local.availability_zones
  single_nat_gateway      = true
  flow_log_retention_days = 30
}

# ── KMS ─────────────────────────────────────────────────

module "kms" {
  source = "../../modules/kms"

  project_name = var.project_name
  environment  = var.environment
}

# ── ECR ─────────────────────────────────────────────────

module "ecr" {
  source = "../../modules/ecr"

  project_name     = var.project_name
  environment      = var.environment
  repository_names = ["care-api", "care-web", "care-seed"]
}

# ── Route53 (DNS) ─────────────────────────────────────
# One hosted zone per domain

module "route53" {
  for_each = var.enable_dns ? toset(local.all_domains) : toset([])
  source   = "../../modules/route53"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = each.value
  alb_dns_name = module.alb.alb_dns_name
  alb_zone_id  = module.alb.alb_zone_id
}

# ── ACM (SSL certificate) ────────────────────────────
# Single certificate covering all domains + wildcards

module "acm" {
  count  = var.enable_dns ? 1 : 0
  source = "../../modules/acm"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  zone_id_map               = { (var.domain_name) = module.route53[var.domain_name].zone_id }
}

# ── RDS (free tier) ─────────────────────────────────────

module "rds" {
  source = "../../modules/rds"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  app_security_group_id      = module.ecs.task_security_group_id
  kms_key_arn                = module.kms.key_arn

  engine_version        = "16.6"
  instance_class        = "db.t3.micro"
  allocated_storage     = 20
  max_allocated_storage = 20
  multi_az              = false
  deletion_protection   = false
  backup_retention_days = 7
  master_password       = var.db_password
}

# ── ALB ─────────────────────────────────────────────────

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn = var.enable_dns ? module.acm[0].certificate_arn : ""
  enable_https    = var.enable_dns
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

# ── ECS Fargate ─────────────────────────────────────────

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  alb_security_group_id = module.alb.security_group_id
  api_target_group_arn  = module.alb.api_target_group_arn
  web_target_group_arn  = module.alb.web_target_group_arn
  secret_arn            = module.secrets_manager.secret_arn
  kms_key_arn           = module.kms.key_arn

  # Minimum Fargate sizes
  api_cpu           = 512    # 0.5 vCPU
  api_memory        = 1024   # 1 GB
  api_desired_count = 1
  api_max_count     = 3

  web_cpu           = 256    # 0.25 vCPU
  web_memory        = 512    # 0.5 GB
  web_desired_count = 1
  web_max_count     = 2

  log_retention_days = 14
}

# ── SES (email sending + domain verification) ────────────

module "ses" {
  count  = var.enable_dns ? 1 : 0
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  zone_id      = module.route53[var.domain_name].zone_id
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
