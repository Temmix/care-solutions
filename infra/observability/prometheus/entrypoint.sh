#!/bin/sh
# Writes the scrape token to a file Prometheus' basic_auth password_file
# can reference, then execs Prometheus.
#
# Required env: PROMETHEUS_SCRAPE_TOKEN — must match the same env var on
# the API service that protects /metrics.
set -e

if [ -z "$PROMETHEUS_SCRAPE_TOKEN" ]; then
  echo "ERROR: PROMETHEUS_SCRAPE_TOKEN env var not set; cannot scrape API /metrics"
  exit 1
fi

mkdir -p /etc/prometheus
printf '%s' "$PROMETHEUS_SCRAPE_TOKEN" > /etc/prometheus/scrape_token
chmod 600 /etc/prometheus/scrape_token

exec /bin/prometheus "$@"
