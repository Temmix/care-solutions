FROM grafana/grafana:11.2.2

# Provisioning files configure Grafana declaratively at startup —
# data sources, dashboards, alert rules. Treats the Grafana volume
# as cache, not source of truth.
COPY provisioning/ /etc/grafana/provisioning/
COPY dashboards/ /var/lib/grafana/dashboards/

# Sensitive bits (admin password, SMTP creds) come from env vars at
# runtime; see infra/observability/README.md for the required vars.

EXPOSE 3000
