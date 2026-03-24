locals {
  availability_zones = ["${var.aws_region}a", "${var.aws_region}b"]
}

# ── VPC (NAT Gateway for private subnets) ───────────────

module "vpc" {
  source = "../../modules/vpc"

  project_name            = var.project_name
  environment             = var.environment
  vpc_cidr                = "10.4.0.0/16"
  availability_zones      = local.availability_zones
  enable_nat_gateway      = true
  flow_log_retention_days = 90
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
  repository_names = ["care-api-prod", "care-web-prod"]
}

# ── Route53 (reuse existing zone created by staging) ────
# The hosted zone for clinvara.com already exists — look it
# up via data source to avoid creating a duplicate zone.

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

# DNS records pointing to production ALB
resource "aws_route53_record" "apex" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

resource "aws_route53_record" "app" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api" {
  zone_id = data.aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.alb.alb_dns_name
    zone_id                = module.alb.alb_zone_id
    evaluate_target_health = true
  }
}

# ── ACM (TLS certificate) ──────────────────────────────

module "acm" {
  source = "../../modules/acm"

  project_name            = var.project_name
  environment             = var.environment
  domain_name             = var.domain_name
  subject_alternative_names = [
    "*.${var.domain_name}",
  ]
  zone_id_map = {
    (var.domain_name) = data.aws_route53_zone.main.zone_id
  }
}

# ── WAF ─────────────────────────────────────────────────

module "waf" {
  source = "../../modules/waf"

  project_name       = var.project_name
  environment        = var.environment
  rate_limit         = 2000
  log_retention_days = 365
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = module.alb.alb_arn
  web_acl_arn  = module.waf.web_acl_arn
}

# ── RDS (production-grade) ──────────────────────────────

module "rds" {
  source = "../../modules/rds"

  project_name               = var.project_name
  environment                = var.environment
  vpc_id                     = module.vpc.vpc_id
  private_subnet_ids         = module.vpc.private_subnet_ids
  app_security_group_id      = module.ecs.task_security_group_id
  kms_key_arn                = module.kms.key_arn

  engine_version               = "16.6"
  instance_class               = "db.t3.small"
  allocated_storage            = 50
  max_allocated_storage        = 200
  multi_az                     = true
  deletion_protection          = true
  backup_retention_days        = 7
  master_password              = var.db_password
  monitoring_interval          = 60
  performance_insights_enabled = true
}

# ── ALB (HTTPS enabled) ────────────────────────────────

module "alb" {
  source = "../../modules/alb"

  project_name      = var.project_name
  environment       = var.environment
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  certificate_arn   = module.acm.certificate_arn
  enable_https      = true
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

# ── ECS Fargate (private subnets, autoscaling) ──────────

module "ecs" {
  source = "../../modules/ecs"

  project_name          = var.project_name
  environment           = var.environment
  aws_region            = var.aws_region
  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  assign_public_ip      = false
  alb_security_group_id = module.alb.security_group_id
  api_target_group_arn  = module.alb.api_target_group_arn
  web_target_group_arn  = module.alb.web_target_group_arn
  secret_arn            = module.secrets_manager.secret_arn
  kms_key_arn           = module.kms.key_arn

  api_cpu           = 512    # 0.5 vCPU
  api_memory        = 1024   # 1 GB
  api_desired_count = 2
  api_max_count     = 4

  web_cpu           = 256    # 0.25 vCPU
  web_memory        = 512    # 0.5 GB
  web_desired_count = 2
  web_max_count     = 3

  log_retention_days = 30
}

# ── SES (reuses the same domain — zone already verified) ─

module "ses" {
  source = "../../modules/ses"

  project_name = var.project_name
  environment  = var.environment
  domain_name  = var.domain_name
  zone_id      = data.aws_route53_zone.main.zone_id
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
