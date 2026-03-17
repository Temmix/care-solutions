variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for encrypting the secret"
  type        = string
}

variable "database_url" {
  description = "PostgreSQL connection string"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "encryption_master_key" {
  description = "Master encryption key (hex)"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe API secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook signing secret"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_price_starter" {
  description = "Stripe price ID for Starter plan"
  type        = string
  default     = ""
}

variable "stripe_price_professional" {
  description = "Stripe price ID for Professional plan"
  type        = string
  default     = ""
}

variable "stripe_price_enterprise" {
  description = "Stripe price ID for Enterprise plan"
  type        = string
  default     = ""
}
