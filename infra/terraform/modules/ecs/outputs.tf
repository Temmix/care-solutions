output "cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "api_service_name" {
  description = "Name of the API ECS service"
  value       = aws_ecs_service.api.name
}

output "web_service_name" {
  description = "Name of the Web ECS service"
  value       = aws_ecs_service.web.name
}

output "task_security_group_id" {
  description = "Security group ID for ECS tasks"
  value       = aws_security_group.tasks.id
}

output "api_task_definition_family" {
  description = "API task definition family name"
  value       = aws_ecs_task_definition.api.family
}

output "web_task_definition_family" {
  description = "Web task definition family name"
  value       = aws_ecs_task_definition.web.family
}
