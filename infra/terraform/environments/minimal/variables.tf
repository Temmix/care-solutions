variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-2"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "care-solutions"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "minimal"
}

variable "github_repo" {
  description = "GitHub repository in format owner/repo"
  type        = string
  default     = "Temmix/care-solutions"
}

# Secrets
variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret"
  type        = string
  sensitive   = true
}

variable "encryption_master_key" {
  description = "Encryption master key (hex)"
  type        = string
  sensitive   = true
}

variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  sensitive   = true
  default     = ""
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  sensitive   = true
  default     = ""
}

# Domain
variable "domain_name" {
  description = "Primary domain name (e.g. clinvara.com)"
  type        = string
  default     = "clinvara.com"
}

variable "additional_domains" {
  description = "Additional domain names that redirect to the primary domain"
  type        = list(string)
  default     = ["clinvara.co.uk", "clinvara.health"]
}

variable "enable_dns" {
  description = "Enable Route53 hosted zone, ACM certificate, and HTTPS"
  type        = bool
  default     = false
}
