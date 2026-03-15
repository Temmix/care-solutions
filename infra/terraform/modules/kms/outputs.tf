output "key_id" {
  description = "The ID of the KMS key"
  value       = aws_kms_key.encryption.key_id
}

output "key_arn" {
  description = "The ARN of the KMS key"
  value       = aws_kms_key.encryption.arn
}

output "alias_arn" {
  description = "The ARN of the KMS key alias"
  value       = aws_kms_alias.encryption.arn
}
