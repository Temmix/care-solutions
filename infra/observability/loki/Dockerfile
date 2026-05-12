FROM grafana/loki:3.2.0

# Single-binary Loki running with filesystem storage on a Railway volume.
# No object store, no clustering — fine for the volume of logs Clinvara
# generates. Volume mount at /loki holds chunks + index for 30 days.

COPY loki-config.yml /etc/loki/local-config.yaml

EXPOSE 3100

# Default Loki entrypoint uses /etc/loki/local-config.yaml — no changes needed.
