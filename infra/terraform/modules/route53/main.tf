# ── Hosted Zone ─────────────────────────────────────────
# Creates a public hosted zone for the domain.
# After creation, update your domain registrar's nameservers
# to the NS records output by this module.

resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name        = var.domain_name
    Environment = var.environment
    Project     = var.project_name
  }
}

locals {
  # When subdomain_prefix is set (e.g. "staging"), records become:
  #   staging.clinvara.com, staging-app.clinvara.com, staging-api.clinvara.com
  # When empty, records are: clinvara.com, www.clinvara.com, app.clinvara.com, api.clinvara.com
  prefix     = var.subdomain_prefix != "" ? "${var.subdomain_prefix}." : ""
  app_prefix = var.subdomain_prefix != "" ? "${var.subdomain_prefix}-app." : "app."
  api_prefix = var.subdomain_prefix != "" ? "${var.subdomain_prefix}-api." : "api."
}

# ── A Record (apex or subdomain → ALB) ────────────────

resource "aws_route53_record" "apex" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "${local.prefix}${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ── CNAME: www → apex (only for apex records) ─────────

resource "aws_route53_record" "www" {
  count   = var.create_records && var.subdomain_prefix == "" ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

# ── app → ALB ────────────────────────────────────────

resource "aws_route53_record" "app" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "${local.app_prefix}${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ── api → ALB ────────────────────────────────────────

resource "aws_route53_record" "api" {
  count   = var.create_records ? 1 : 0
  zone_id = aws_route53_zone.main.zone_id
  name    = "${local.api_prefix}${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
