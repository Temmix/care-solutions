import { MetricsService } from '../src/modules/metrics/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('observeHttpRequest', () => {
    it('records duration and increments count for a successful request', async () => {
      service.observeHttpRequest('GET', '/api/patients', 200, 0.123);
      const text = await service.render();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/patients",status_code="200"} 1',
      );
      expect(text).toContain('http_request_duration_seconds_sum{');
    });

    it('separates buckets by method, route, and status code', async () => {
      service.observeHttpRequest('GET', '/api/patients', 200, 0.05);
      service.observeHttpRequest('POST', '/api/patients', 201, 0.2);
      service.observeHttpRequest('GET', '/api/patients/:id', 404, 0.01);
      const text = await service.render();
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/patients",status_code="200"} 1',
      );
      expect(text).toContain(
        'http_requests_total{method="POST",route="/api/patients",status_code="201"} 1',
      );
      expect(text).toContain(
        'http_requests_total{method="GET",route="/api/patients/:id",status_code="404"} 1',
      );
    });
  });

  describe('observeHttpException', () => {
    it('increments by status_code + exception_class', async () => {
      service.observeHttpException(500, 'PrismaClientKnownRequestError');
      service.observeHttpException(401, 'UnauthorizedException');
      service.observeHttpException(401, 'UnauthorizedException');
      const text = await service.render();
      expect(text).toContain(
        'http_exceptions_total{status_code="500",exception_class="PrismaClientKnownRequestError"} 1',
      );
      expect(text).toContain(
        'http_exceptions_total{status_code="401",exception_class="UnauthorizedException"} 2',
      );
    });
  });

  describe('render', () => {
    it('returns Prometheus text format with default Node metrics included', async () => {
      const text = await service.render();
      expect(text).toContain('# HELP process_cpu_user_seconds_total');
      expect(text).toContain('# HELP nodejs_eventloop_lag_seconds');
    });

    it('exposes the correct content type for Prometheus scrape', () => {
      expect(service.contentType()).toContain('text/plain');
      expect(service.contentType()).toContain('version=0.0.4');
    });
  });

  // ── Phase 2 ───────────────────────────────────────────

  describe('business metrics', () => {
    it('subscriptions gauge can be set and reset', async () => {
      service.setSubscriptionsActive('STARTER', 'ACTIVE', 5);
      service.setSubscriptionsActive('PROFESSIONAL', 'TRIALING', 3);
      let text = await service.render();
      expect(text).toContain('clinvara_subscriptions_active{tier="STARTER",status="ACTIVE"} 5');
      expect(text).toContain(
        'clinvara_subscriptions_active{tier="PROFESSIONAL",status="TRIALING"} 3',
      );

      service.resetSubscriptionsActive();
      text = await service.render();
      expect(text).not.toContain('clinvara_subscriptions_active{tier=');
    });

    it('trials gauge can be set per bucket', async () => {
      service.setTrialsActive('1-3d', 2);
      service.setTrialsActive('4-7d', 5);
      const text = await service.render();
      expect(text).toContain('clinvara_trials_active{bucket="1-3d"} 2');
      expect(text).toContain('clinvara_trials_active{bucket="4-7d"} 5');
    });

    it('stripe webhook counter labels correctly by event_type + outcome', async () => {
      service.observeStripeWebhook('customer.subscription.updated', 'processed', 0.05);
      service.observeStripeWebhook('customer.subscription.updated', 'deduplicated');
      service.observeStripeWebhook('checkout.session.completed', 'signature_failed');
      const text = await service.render();
      expect(text).toContain(
        'clinvara_stripe_webhook_total{event_type="customer.subscription.updated",outcome="processed"} 1',
      );
      expect(text).toContain(
        'clinvara_stripe_webhook_total{event_type="customer.subscription.updated",outcome="deduplicated"} 1',
      );
      expect(text).toContain(
        'clinvara_stripe_webhook_total{event_type="checkout.session.completed",outcome="signature_failed"} 1',
      );
    });

    it('trial reminder cron heartbeat + counter', async () => {
      service.observeTrialReminderRun(7, 'success');
      service.observeTrialReminderRun(7, 'success');
      service.observeTrialReminderRun(3, 'failed');
      service.setTrialReminderLastRun(1700000000);
      const text = await service.render();
      expect(text).toContain('clinvara_trial_reminder_runs_total{bucket="7",outcome="success"} 2');
      expect(text).toContain('clinvara_trial_reminder_runs_total{bucket="3",outcome="failed"} 1');
      expect(text).toContain('clinvara_trial_reminder_last_run_timestamp_seconds 1700000000');
    });
  });

  describe('database metrics', () => {
    it('records prisma query duration by model+action', async () => {
      service.observePrismaQuery('Patient', 'findUnique', 0.02);
      service.observePrismaQuery('Patient', 'findMany', 0.15);
      const text = await service.render();
      expect(text).toContain(
        'prisma_query_duration_seconds_count{model="Patient",action="findUnique"} 1',
      );
      expect(text).toContain(
        'prisma_query_duration_seconds_count{model="Patient",action="findMany"} 1',
      );
    });

    it('counts query errors by class', async () => {
      service.observePrismaQueryError('Subscription', 'create', 'PrismaClientKnownRequestError');
      const text = await service.render();
      expect(text).toContain(
        'prisma_query_errors_total{model="Subscription",action="create",error_class="PrismaClientKnownRequestError"} 1',
      );
    });
  });

  describe('websocket metrics', () => {
    it('connections gauge tracks increment/decrement', async () => {
      service.incrementWsConnections();
      service.incrementWsConnections();
      service.incrementWsConnections();
      service.decrementWsConnections();
      const text = await service.render();
      expect(text).toContain('clinvara_websocket_connections_active 2');
    });
  });
});
