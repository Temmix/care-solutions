output "certificate_arn" {
  description = "The ARN of the ACM certificate"
  value       = aws_acm_certificate.main.arn
}

output "domain_validation_options" {
  description = "DNS validation records (use if not auto-validating via Route53)"
  value       = aws_acm_certificate.main.domain_validation_options
}
