output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name (point your domain here)"
  value       = module.alb.alb_dns_name
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value       = module.ecr.repository_urls
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = module.ecs.cluster_name
}

output "api_service_name" {
  description = "API ECS service name"
  value       = module.ecs.api_service_name
}

output "web_service_name" {
  description = "Web ECS service name"
  value       = module.ecs.web_service_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "github_actions_role_arn" {
  description = "GitHub Actions IAM role ARN"
  value       = aws_iam_role.github_actions.arn
}

output "nameservers" {
  description = "Route53 nameservers — set these at your domain registrar"
  value       = var.enable_dns ? module.route53[0].nameservers : []
}

output "domain_name" {
  description = "Primary domain name"
  value       = var.enable_dns ? var.domain_name : null
}
