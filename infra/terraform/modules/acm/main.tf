resource "aws_acm_certificate" "main" {
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name        = var.domain_name
    Environment = var.environment
    Project     = var.project_name
  }
}

# Look up the correct zone ID for each domain validation option.
# A wildcard like *.clinvara.co.uk shares the same validation record
# as clinvara.co.uk, so we match the base domain from the zone_id_map.
locals {
  dvo_map = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name    = dvo.resource_record_name
      record  = dvo.resource_record_value
      type    = dvo.resource_record_type
      zone_id = lookup(
        var.zone_id_map,
        dvo.domain_name,
        lookup(var.zone_id_map, trimprefix(dvo.domain_name, "*."), "")
      )
    }
  }
}

resource "aws_route53_record" "validation" {
  for_each = local.dvo_map

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = each.value.zone_id
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}
