locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

resource "aws_kms_key" "encryption" {
  description             = "Encryption key for ${local.name_prefix} DEKs"
  deletion_window_in_days = var.deletion_window_days
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name        = "${local.name_prefix}-encryption-key"
    Environment = var.environment
    Project     = var.project_name
  }
}

resource "aws_kms_alias" "encryption" {
  name          = "alias/${local.name_prefix}-encryption-key"
  target_key_id = aws_kms_key.encryption.key_id
}

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "kms_key_policy" {
  # Allow root account full access
  statement {
    sid    = "EnableRootAccountAccess"
    effect = "Allow"
    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }
    actions   = ["kms:*"]
    resources = ["*"]
  }

  # Allow API pods (via IRSA) to use key for encrypt/decrypt
  dynamic "statement" {
    for_each = length(var.api_role_arns) > 0 ? [1] : []
    content {
      sid    = "AllowAPIPodsAccess"
      effect = "Allow"
      principals {
        type        = "AWS"
        identifiers = var.api_role_arns
      }
      actions = [
        "kms:Decrypt",
        "kms:GenerateDataKey",
        "kms:DescribeKey",
      ]
      resources = ["*"]
    }
  }
}
