variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "domain_name" {
  description = "Primary domain name (e.g. clinvara.com)"
  type        = string
}

variable "alb_dns_name" {
  description = "ALB DNS name to point the domain to"
  type        = string
}

variable "alb_zone_id" {
  description = "ALB hosted zone ID (for alias records)"
  type        = string
}
