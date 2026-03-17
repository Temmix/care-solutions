locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_secretsmanager_secret" "api" {
  name        = "${var.project_name}/${var.environment}/api"
  description = "API secrets for ${local.name_prefix}"
  kms_key_id  = var.kms_key_arn

  tags = {
    Name        = "${local.name_prefix}-api-secrets"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "api" {
  secret_id = aws_secretsmanager_secret.api.id

  secret_string = jsonencode({
    DATABASE_URL              = var.database_url
    JWT_SECRET                = var.jwt_secret
    ENCRYPTION_MASTER_KEY     = var.encryption_master_key
    STRIPE_SECRET_KEY         = var.stripe_secret_key
    STRIPE_WEBHOOK_SECRET     = var.stripe_webhook_secret
    AWS_KMS_KEY_ARN           = var.kms_key_arn
    STRIPE_PRICE_STARTER      = var.stripe_price_starter
    STRIPE_PRICE_PROFESSIONAL = var.stripe_price_professional
    STRIPE_PRICE_ENTERPRISE   = var.stripe_price_enterprise
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}
