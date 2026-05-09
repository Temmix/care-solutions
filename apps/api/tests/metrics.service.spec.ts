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
});
