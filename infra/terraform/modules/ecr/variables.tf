variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "repository_names" {
  description = "List of ECR repository names to create"
  type        = list(string)
  default     = ["care-api", "care-web"]
}

variable "max_tagged_images" {
  description = "Maximum number of tagged images to retain"
  type        = number
  default     = 20
}

variable "untagged_expiry_days" {
  description = "Number of days before untagged images expire"
  type        = number
  default     = 7
}
