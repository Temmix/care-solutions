variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "private_subnet_ids" {
  description = "Private subnet IDs for Fargate tasks"
  type        = list(string)
}

variable "alb_security_group_id" {
  description = "Security group ID of the ALB"
  type        = string
}

variable "api_target_group_arn" {
  description = "ALB target group ARN for API"
  type        = string
}

variable "web_target_group_arn" {
  description = "ALB target group ARN for Web"
  type        = string
}

variable "secret_arn" {
  description = "Secrets Manager secret ARN"
  type        = string
}

variable "kms_key_arn" {
  description = "KMS key ARN for API encryption"
  type        = string
}

# ── API Task ────────────────────────────────────────────

variable "api_image" {
  description = "Docker image for API"
  type        = string
  default     = "PLACEHOLDER"
}

variable "api_cpu" {
  description = "CPU units for API task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory in MB for API task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "api_max_count" {
  description = "Maximum number of API tasks for autoscaling"
  type        = number
  default     = 4
}

# ── Web Task ────────────────────────────────────────────

variable "web_image" {
  description = "Docker image for Web"
  type        = string
  default     = "PLACEHOLDER"
}

variable "web_cpu" {
  description = "CPU units for Web task (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "web_memory" {
  description = "Memory in MB for Web task"
  type        = number
  default     = 512
}

variable "web_desired_count" {
  description = "Desired number of Web tasks"
  type        = number
  default     = 1
}

variable "web_max_count" {
  description = "Maximum number of Web tasks for autoscaling"
  type        = number
  default     = 3
}

variable "log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}
