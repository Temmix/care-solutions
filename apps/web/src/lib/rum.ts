import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import type { Metric } from 'web-vitals';

const ENDPOINT_VITALS = '/api/rum/web-vital';
const ENDPOINT_ERRORS = '/api/rum/js-error';

/**
 * Convert the current `location.pathname` to a route TEMPLATE — strip any
 * dynamic segment that looks like a UUID, ULID, or numeric ID. The backend
 * rejects payloads containing dynamic-looking segments to keep Prometheus
 * cardinality bounded and avoid leaking patient/tenant IDs.
 *
 * Examples:
 *   /app/patients/abc-123-uuid          → /app/patients/:id
 *   /app/patients/abc-123/care-plans/9  → /app/patients/:id/care-plans/:id
 *   /app/billing                        → /app/billing
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;
const SHORT_ID_RE = /^[a-z0-9]{16,}$/i;

export function pageTemplate(): string {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const stripped = segments.map((s) =>
    UUID_RE.test(s) || NUMERIC_RE.test(s) || SHORT_ID_RE.test(s) ? ':id' : s,
  );
  return '/' + stripped.join('/');
}

/**
 * Send a beacon. Uses sendBeacon when available (fire-and-forget, no
 * pending request blocks page unload). Falls back to fetch with keepalive.
 *
 * Auth: relies on the access token stored in localStorage by AuthContext.
 * If no token is set (logged-out user) we skip — anon RUM data isn't useful.
 */
function beacon(endpoint: string, payload: unknown): void {
  const token = localStorage.getItem('access_token');
  if (!token) return;

  const body = JSON.stringify(payload);

  // sendBeacon doesn't take headers — we can't attach the bearer token via
  // it directly. Use fetch+keepalive instead. Both are non-blocking.
  fetch(endpoint, {
    method: 'POST',
    keepalive: true,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
  }).catch(() => {
    // Swallow — we never want RUM to surface as a UI error.
  });
}

function sendVital(metric: Metric): void {
  beacon(ENDPOINT_VITALS, {
    kind: 'web-vital',
    page: pageTemplate(),
    metric: metric.name,
    value: metric.value,
    rating: metric.rating,
  });
}

let initialised = false;

/**
 * Initialise RUM. Call once on app startup.
 *
 * - Registers Web Vitals collectors (LCP, INP, CLS, TTFB, FCP). These fire
 *   once per metric per page-load, when the value is finalised.
 * - Installs window.onerror + onunhandledrejection so uncaught JS errors
 *   become beacons. Errors don't fire on every render — only on actual
 *   uncaught exceptions, so volume is low.
 *
 * FID is intentionally not subscribed — replaced by INP in web-vitals 4+.
 */
export function initRum(): void {
  if (initialised) return;
  initialised = true;

  onCLS(sendVital);
  onINP(sendVital);
  onLCP(sendVital);
  onTTFB(sendVital);
  onFCP(sendVital);

  window.addEventListener('error', (event) => {
    beacon(ENDPOINT_ERRORS, {
      kind: 'js-error',
      page: pageTemplate(),
      message: event.message?.slice(0, 500),
      stack: event.error?.stack?.slice(0, 4000),
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string | undefined;
    const message = typeof reason === 'string' ? reason : reason?.message;
    const stack = typeof reason === 'object' ? reason?.stack : undefined;
    beacon(ENDPOINT_ERRORS, {
      kind: 'js-error',
      page: pageTemplate(),
      message: message?.slice(0, 500) ?? 'unhandled promise rejection',
      stack: stack?.slice(0, 4000),
    });
  });
}
