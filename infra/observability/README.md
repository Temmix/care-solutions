# Observability — Prometheus + Grafana on Railway

Phase 1 of the observability stack. Adds an HTTP-metrics + error-rate
foundation in production. Subsequent phases add business metrics, DB,
WebSocket, frontend RUM, and staging parity.

## What this ships

- `apps/api` exposes `GET /metrics` (Prometheus text format), protected
  by HTTP Basic Auth (env var `PROMETHEUS_SCRAPE_TOKEN`)
- `infra/observability/prometheus/` — Dockerfile + scrape config for a
  Railway-hosted Prometheus
- `infra/observability/grafana/` — Dockerfile + provisioned data source,
  dashboards, alert rules
- Two dashboards: API Overview, Errors
- One alert: API error rate above 2% for 5 minutes (email)

## Required Railway env vars

### `clinvara-api` (production)

| Var                       | Value                  | Notes                              |
| ------------------------- | ---------------------- | ---------------------------------- |
| `PROMETHEUS_SCRAPE_TOKEN` | random 32+ char string | Same value as on `prometheus-prod` |

### `prometheus-prod` (new service in europe-west4)

| Var                       | Value         | Notes                                         |
| ------------------------- | ------------- | --------------------------------------------- |
| `PROMETHEUS_SCRAPE_TOKEN` | same as above | Used by entrypoint to write scrape_token file |

### `grafana` (new service in europe-west4)

| Var                          | Value                   | Notes                                                    |
| ---------------------------- | ----------------------- | -------------------------------------------------------- |
| `GF_SECURITY_ADMIN_USER`     | `admin`                 | Initial admin login                                      |
| `GF_SECURITY_ADMIN_PASSWORD` | random                  | Save in 1Password                                        |
| `GF_SMTP_ENABLED`            | `true`                  | Enables alert emails                                     |
| `GF_SMTP_HOST`               | `smtp.resend.com:587`   | Resend's SMTP gateway                                    |
| `GF_SMTP_USER`               | `resend`                | Literal string                                           |
| `GF_SMTP_PASSWORD`           | your Resend API key     | Reuses `RESEND_API_KEY` value                            |
| `GF_SMTP_FROM_ADDRESS`       | `alerts@clinvara.com`   | Must be a verified Resend sender                         |
| `GF_SMTP_FROM_NAME`          | `Clinvara Alerts`       | Display name                                             |
| `ALERT_EMAIL_RECIPIENTS`     | `temi@clinvara.com,...` | Comma-separated; consumed by alerting/contact-points.yml |

## Provisioning the Railway services (one-time, manual)

### 1. `prometheus-prod`

1. Railway dashboard → clinvara → **production** env → **+ New** → **Empty service**
2. Connect this repo, set **Root Directory** to `infra/observability/prometheus`
3. **Settings → Region** → `europe-west4-drams3a`
4. **Settings → Volumes** → add volume `/prometheus` size 5GB
5. Set env var `PROMETHEUS_SCRAPE_TOKEN`
6. Deploy → confirm logs show `Server is ready to receive web requests`
7. **Networking → Public Networking** → leave OFF (only Grafana needs to reach it via internal DNS)

### 2. `grafana`

1. Railway → production → **+ New** → **Empty service**
2. Repo connected, **Root Directory**: `infra/observability/grafana`
3. **Region**: `europe-west4-drams3a`
4. **Volumes** → `/var/lib/grafana` size 1GB
5. Set env vars from the table above (admin user/password + SMTP + ALERT_EMAIL_RECIPIENTS)
6. **Networking → Public Networking** → ON, port 3000, attach `grafana.clinvara.com` custom domain (or use the auto-generated `*.up.railway.app`)
7. Deploy

### 3. Verify scrape

- Visit `https://grafana.clinvara.com` → log in
- **Connections → Data sources** → `prometheus-prod` should show "Working"
- Open dashboard **Clinvara → API Overview** → metrics should populate within 30s

## Local development

`PROMETHEUS_SCRAPE_TOKEN` is optional locally — when unset, `/metrics`
returns 401 to every caller (fail-closed). Set it to any value in
`.env` if you want to scrape locally.

## Troubleshooting

| Symptom                                              | Likely cause                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Prometheus targets page shows `clinvara-api` as DOWN | `PROMETHEUS_SCRAPE_TOKEN` mismatch between API and Prometheus services                   |
| Grafana shows no data on dashboards                  | Data source URL wrong (`http://prometheus-prod.railway.internal:9090`) or scrape failing |
| Email alerts not arriving                            | SMTP creds wrong, or `alerts@clinvara.com` not verified in Resend                        |
| 401 on /metrics from Prometheus                      | Scrape token differs between services or env var unset                                   |

## Phase 2 — additional Railway service

After Phase 2 lands, provision one more service:

### `postgres-exporter-prod`

1. Railway → production → **+ New** → **Empty service**
2. Repo connected, **Root Directory**: `infra/observability/postgres-exporter`
3. **Region**: `europe-west4-drams3a` (same as Postgres)
4. Set env var:
   - `DATA_SOURCE_NAME=postgresql://postgres:${{Postgres-s0gq.PGPASSWORD}}@postgres-s0gq.railway.internal:5432/railway?sslmode=disable`
   - (Use Railway's variable reference syntax to pull the password from the Postgres service.)
5. **Networking → Public Networking** → leave OFF
6. Deploy

Prometheus already has the scrape config for `postgres-exporter-prod.railway.internal:9187` baked in — restart Prometheus after the exporter is up.

## Out of scope for Phase 2

Encryption per-operation timing (deferred — invasive in `encryption.middleware.ts`). Frontend RUM, staging parity. See the original observability plan for phases 3–4.

## Phase 5 — Loki (centralised logs)

After Phase 5 ships, you can view all API logs in Grafana via the `loki` data source.

### Provisioning `loki` (production)

1. Railway dashboard → clinvara → **production** env → **+ New** → **GitHub Repo** → `Temmix/care-solutions`
2. Rename to `loki`
3. Settings → **Source → Root Directory**: `infra/observability/loki`
4. Settings → **Region**: `europe-west4-drams3a`
5. Settings → **Enable Outbound IPv6**: ON
6. Settings → **Volumes**: mount `/loki` size 5GB (chunks + index, 30-day retention)
7. **Networking → Public Networking**: leave OFF (Grafana reaches it via internal DNS)
8. Deploy

### Wire the API to push logs

Set this env var on `clinvara-api`:

```
LOKI_URL=http://loki.railway.internal:3100
```

API redeploys → next requests start pushing logs to Loki via the LokiTransport (batched every 1s or 100 lines).

### View in Grafana

- Connections → Data sources → `loki` → Test → should be green
- Dashboards → Clinvara → **Logs** → live tail with filters by service + level
- Or **Explore** with the `loki` data source for ad-hoc LogQL queries

### Cardinality safety

LokiTransport uses only `level` and `service` (controller name) as stream labels plus any static labels. **No userId/tenantId labels** — those go in the log body (full-text searchable) to prevent unbounded stream growth.
