import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

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

  readonly httpRequestDuration: Histogram<string>;
  readonly httpRequestsTotal: Counter<string>;
  readonly httpExceptionsTotal: Counter<string>;

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

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
