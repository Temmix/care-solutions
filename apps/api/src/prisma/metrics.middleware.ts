import type { Prisma } from '@prisma/client';
import type { MetricsService } from '../modules/metrics/metrics.service';

type PrismaLike = { $use: (mw: Prisma.Middleware) => void };

/**
 * Prisma middleware that records query duration + error counts.
 *
 * Register order matters: this middleware should be registered AFTER the
 * encryption middleware so it measures pure database time (encryption
 * time is reported separately by `clinvara_encryption_*` metrics).
 *
 * Labels:
 * - `model` — the Prisma delegate name (`Patient`, `Subscription`, etc.).
 *   `null` for raw queries; we coerce to `'raw'`.
 * - `action` — Prisma operation (`findUnique`, `findMany`, `create`, etc.).
 *   This is bounded by Prisma's API, low cardinality.
 * - `error_class` — caught exception's constructor name (also bounded).
 *
 * No values from `params.args` enter labels — those would contain user
 * input and PII (patient names, IDs) and would explode cardinality.
 */
export function setupPrismaMetricsMiddleware(prisma: PrismaLike, metrics: MetricsService): void {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const model = params.model ?? 'raw';
    const action = params.action;
    try {
      const result = await next(params);
      metrics.observePrismaQuery(model, action, (Date.now() - start) / 1000);
      return result;
    } catch (e) {
      const errorClass = (e as { constructor?: { name?: string } })?.constructor?.name ?? 'Unknown';
      metrics.observePrismaQueryError(model, action, errorClass);
      // Don't observe duration for errors — keeps the histogram clean.
      throw e;
    }
  });
}
