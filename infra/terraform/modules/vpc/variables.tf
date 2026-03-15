variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g., prod, staging)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["eu-west-2a", "eu-west-2b", "eu-west-2c"]
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway instead of one per AZ (saves cost, reduces HA)"
  type        = bool
  default     = false
}

variable "flow_log_retention_days" {
  description = "CloudWatch log retention for VPC flow logs"
  type        = number
  default     = 365
}
