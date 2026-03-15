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

# ── A Record (apex → ALB) ──────────────────────────────
# clinvara.com → ALB

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ── CNAME: www → apex ──────────────────────────────────
# www.clinvara.com → clinvara.com

resource "aws_route53_record" "www" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [var.domain_name]
}

# ── CNAME: app → ALB ──────────────────────────────────
# app.clinvara.com → ALB (for future subdomain split)

resource "aws_route53_record" "app" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

# ── CNAME: api → ALB ──────────────────────────────────
# api.clinvara.com → ALB (for future API subdomain)

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}
