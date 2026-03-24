variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "domain_name" {
  description = "Domain name to verify with SES (e.g. clinvara.com)"
  type        = string
}

variable "zone_id" {
  description = "Route53 hosted zone ID for DNS verification records"
  type        = string
}

variable "mail_from_subdomain" {
  description = "Subdomain for MAIL FROM (e.g. 'mail' creates mail.clinvara.com)"
  type        = string
  default     = "mail"
}
