variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "public_subnet_ids" {
  description = "Public subnet IDs for the ALB"
  type        = list(string)
}

variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS (empty string = HTTP only)"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Enable HTTPS listener and HTTP→HTTPS redirect (must be known at plan time)"
  type        = bool
  default     = false
}
