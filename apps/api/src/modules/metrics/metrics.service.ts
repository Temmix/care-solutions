import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Centralised Prometheus registry + metric definitions.
 *
 * All labels here MUST be enumerable and low-cardinality. Specifically:
 * - `route` is the Express route TEMPLATE (e.g. `/api/patients/:id`), never
 *   the actual request URL. The interceptor extracts this from `req.route.path`.
 * - No PII (emails, names, NHS numbers, raw paths) ever appears as a label.
 *
 * Adding a new metric: define it in the constructor, register on `this.registry`,
 * and expose a typed observe* method. Don't reach into the registry from
 * elsewhere.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  // HTTP
  readonly httpRequestDuration: Histogram<string>;
  readonly httpRequestsTotal: Counter<string>;
  readonly httpExceptionsTotal: Counter<string>;

  // Business
  readonly subscriptionsActive: Gauge<string>;
  readonly trialsActive: Gauge<string>;
  readonly stripeWebhooksTotal: Counter<string>;
  readonly stripeWebhookDuration: Histogram<string>;
  readonly trialReminderRunsTotal: Counter<string>;
  readonly trialReminderLastRun: Gauge<string>;

  // Database
  readonly prismaQueryDuration: Histogram<string>;
  readonly prismaQueryErrorsTotal: Counter<string>;

  // Encryption
  readonly encryptionOperationsTotal: Counter<string>;
  readonly encryptionDuration: Histogram<string>;

  // WebSocket
  readonly wsConnectionsActive: Gauge<string>;
  readonly wsMessagesTotal: Counter<string>;

  // Frontend RUM
  readonly rumWebVital: Histogram<string>;
  readonly rumJsErrorsTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration by method, route template, and status code',
      labelNames: ['method', 'route', 'status_code'],
      // Buckets in seconds — covers fast cache hits to slow reports
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests by method, route template, and status code',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpExceptionsTotal = new Counter({
      name: 'http_exceptions_total',
      help: 'HTTP exceptions by status code and exception class',
      labelNames: ['status_code', 'exception_class'],
      registers: [this.registry],
    });

    this.subscriptionsActive = new Gauge({
      name: 'clinvara_subscriptions_active',
      help: 'Active subscriptions by tier and status (polled every minute)',
      labelNames: ['tier', 'status'],
      registers: [this.registry],
    });

    this.trialsActive = new Gauge({
      name: 'clinvara_trials_active',
      help: 'Active trials grouped by remaining-days bucket',
      labelNames: ['bucket'],
      registers: [this.registry],
    });

    this.stripeWebhooksTotal = new Counter({
      name: 'clinvara_stripe_webhook_total',
      help: 'Stripe webhook deliveries by event type and outcome',
      labelNames: ['event_type', 'outcome'],
      registers: [this.registry],
    });

    this.stripeWebhookDuration = new Histogram({
      name: 'clinvara_stripe_webhook_duration_seconds',
      help: 'Stripe webhook processing duration by event type',
      labelNames: ['event_type'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.trialReminderRunsTotal = new Counter({
      name: 'clinvara_trial_reminder_runs_total',
      help: 'Trial reminder cron runs by bucket and outcome',
      labelNames: ['bucket', 'outcome'],
      registers: [this.registry],
    });

    this.trialReminderLastRun = new Gauge({
      name: 'clinvara_trial_reminder_last_run_timestamp_seconds',
      help: 'Unix timestamp of the last successful trial-reminder cron run',
      registers: [this.registry],
    });

    this.prismaQueryDuration = new Histogram({
      name: 'prisma_query_duration_seconds',
      help: 'Prisma query duration by model and action',
      labelNames: ['model', 'action'],
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
      registers: [this.registry],
    });

    this.prismaQueryErrorsTotal = new Counter({
      name: 'prisma_query_errors_total',
      help: 'Prisma query errors by model, action, and error class',
      labelNames: ['model', 'action', 'error_class'],
      registers: [this.registry],
    });

    this.encryptionOperationsTotal = new Counter({
      name: 'clinvara_encryption_operations_total',
      help: 'AES-GCM field encrypt/decrypt operations by model',
      labelNames: ['operation', 'model'],
      registers: [this.registry],
    });

    this.encryptionDuration = new Histogram({
      name: 'clinvara_encryption_duration_seconds',
      help: 'Field encrypt/decrypt operation duration',
      labelNames: ['operation'],
      buckets: [0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1],
      registers: [this.registry],
    });

    this.wsConnectionsActive = new Gauge({
      name: 'clinvara_websocket_connections_active',
      help: 'Currently-connected WebSocket clients',
      registers: [this.registry],
    });

    this.wsMessagesTotal = new Counter({
      name: 'clinvara_websocket_messages_total',
      help: 'WebSocket messages by event name and direction',
      labelNames: ['event_name', 'direction'],
      registers: [this.registry],
    });

    // Frontend RUM. The metric label is the Web Vital name (LCP, FID, INP,
    // CLS, TTFB, FCP). Most queries filter by `metric=` so the differing
    // unit ranges (CLS is unitless, others ms) don't confuse the histogram —
    // buckets cover both the small (CLS) and large (LCP) ranges. The `page`
    // label is the route TEMPLATE (frontend strips IDs before sending).
    this.rumWebVital = new Histogram({
      name: 'clinvara_rum_web_vital',
      help: 'Real-user Web Vitals reported from the browser',
      labelNames: ['metric', 'page', 'rating'],
      buckets: [
        0.05,
        0.1,
        0.25,
        0.5,
        1,
        2.5, // CLS / unitless / FID seconds
        100,
        250,
        500,
        1000,
        2500,
        4000,
        6000,
        10000, // LCP/INP/TTFB ms
      ],
      registers: [this.registry],
    });

    this.rumJsErrorsTotal = new Counter({
      name: 'clinvara_rum_js_errors_total',
      help: 'JavaScript errors reported from the browser by page',
      labelNames: ['page'],
      registers: [this.registry],
    });
  }

  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ): void {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestsTotal.inc(labels);
  }

  observeHttpException(statusCode: number, exceptionClass: string): void {
    this.httpExceptionsTotal.inc({
      status_code: String(statusCode),
      exception_class: exceptionClass,
    });
  }

  // ── Business ──────────────────────────────────────────

  setSubscriptionsActive(tier: string, status: string, count: number): void {
    this.subscriptionsActive.set({ tier, status }, count);
  }

  resetSubscriptionsActive(): void {
    this.subscriptionsActive.reset();
  }

  setTrialsActive(bucket: string, count: number): void {
    this.trialsActive.set({ bucket }, count);
  }

  resetTrialsActive(): void {
    this.trialsActive.reset();
  }

  observeStripeWebhook(eventType: string, outcome: string, durationSeconds?: number): void {
    this.stripeWebhooksTotal.inc({ event_type: eventType, outcome });
    if (durationSeconds !== undefined) {
      this.stripeWebhookDuration.observe({ event_type: eventType }, durationSeconds);
    }
  }

  observeTrialReminderRun(bucket: number, outcome: 'success' | 'failed'): void {
    this.trialReminderRunsTotal.inc({ bucket: String(bucket), outcome });
  }

  setTrialReminderLastRun(unixSeconds: number): void {
    this.trialReminderLastRun.set(unixSeconds);
  }

  // ── Database ──────────────────────────────────────────

  observePrismaQuery(model: string, action: string, durationSeconds: number): void {
    this.prismaQueryDuration.observe({ model, action }, durationSeconds);
  }

  observePrismaQueryError(model: string, action: string, errorClass: string): void {
    this.prismaQueryErrorsTotal.inc({ model, action, error_class: errorClass });
  }

  // ── Encryption ────────────────────────────────────────

  observeEncryption(
    operation: 'encrypt' | 'decrypt',
    model: string,
    durationSeconds: number,
  ): void {
    this.encryptionOperationsTotal.inc({ operation, model });
    this.encryptionDuration.observe({ operation }, durationSeconds);
  }

  // ── WebSocket ─────────────────────────────────────────

  incrementWsConnections(): void {
    this.wsConnectionsActive.inc();
  }

  decrementWsConnections(): void {
    this.wsConnectionsActive.dec();
  }

  observeWsMessage(eventName: string, direction: 'in' | 'out'): void {
    this.wsMessagesTotal.inc({ event_name: eventName, direction });
  }

  // ── Frontend RUM ──────────────────────────────────────

  observeRumWebVital(metric: string, page: string, rating: string, value: number): void {
    this.rumWebVital.observe({ metric, page, rating }, value);
  }

  observeRumJsError(page: string): void {
    this.rumJsErrorsTotal.inc({ page });
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
