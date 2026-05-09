# prometheuscommunity/postgres-exporter exposes pg_stat_* on port 9187.
# Required env: DATA_SOURCE_NAME=postgresql://user:pass@host:port/db?sslmode=disable
# Set on the Railway service via reference to the Postgres service's
# DATABASE_URL — see infra/observability/README.md.
FROM quay.io/prometheuscommunity/postgres-exporter:v0.15.0
EXPOSE 9187
