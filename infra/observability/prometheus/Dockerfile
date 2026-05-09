FROM prom/prometheus:v2.54.1

# Prometheus container expects config at /etc/prometheus/prometheus.yml.
# We bake it into the image so it ships from the repo and can be
# version-controlled. The scrape token is injected via env var at runtime
# (see entrypoint).
COPY prometheus.yml /etc/prometheus/prometheus.yml
COPY entrypoint.sh /usr/local/bin/clinvara-prom-entrypoint.sh

USER root
RUN chmod +x /usr/local/bin/clinvara-prom-entrypoint.sh
USER nobody

EXPOSE 9090

ENTRYPOINT ["/usr/local/bin/clinvara-prom-entrypoint.sh"]
CMD [ \
  "--config.file=/etc/prometheus/prometheus.yml", \
  "--storage.tsdb.path=/prometheus", \
  "--storage.tsdb.retention.time=30d", \
  "--web.console.libraries=/usr/share/prometheus/console_libraries", \
  "--web.console.templates=/usr/share/prometheus/consoles", \
  "--web.enable-lifecycle" \
]
