output "domain_identity_arn" {
  description = "SES domain identity ARN"
  value       = aws_ses_domain_identity.main.arn
}

output "domain_verified" {
  description = "Whether the SES domain verification completed"
  value       = aws_ses_domain_identity_verification.main.id
}

output "mail_from_domain" {
  description = "The MAIL FROM domain configured"
  value       = local.mail_from_domain
}
