variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "deletion_window_days" {
  description = "Number of days before KMS key deletion"
  type        = number
  default     = 30
}

variable "api_role_arns" {
  description = "IAM role ARNs allowed to use the KMS key (e.g. IRSA roles)"
  type        = list(string)
  default     = []
}
