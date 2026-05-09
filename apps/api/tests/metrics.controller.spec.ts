import { UnauthorizedException } from '@nestjs/common';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { MetricsService } from '../src/modules/metrics/metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metrics: MetricsService;
  let configService: { get: jest.Mock };
  let res: { setHeader: jest.Mock; send: jest.Mock };

  beforeEach(() => {
    metrics = new MetricsService();
    configService = { get: jest.fn() };
    controller = new MetricsController(metrics, configService as any);
    res = { setHeader: jest.fn(), send: jest.fn() };
  });

  const basicAuth = (token: string) =>
    'Basic ' + Buffer.from(`prometheus:${token}`).toString('base64');

  it('rejects requests with no Authorization header', async () => {
    configService.get.mockReturnValue('valid-token');
    await expect(controller.scrape(undefined, res as any)).rejects.toThrow(UnauthorizedException);
  });

  it('rejects requests with non-Basic auth scheme', async () => {
    configService.get.mockReturnValue('valid-token');
    await expect(controller.scrape('Bearer something', res as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests with the wrong token', async () => {
    configService.get.mockReturnValue('valid-token');
    await expect(controller.scrape(basicAuth('wrong-token'), res as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects when PROMETHEUS_SCRAPE_TOKEN env var is unset (fail-closed)', async () => {
    configService.get.mockReturnValue(undefined);
    await expect(controller.scrape(basicAuth('any-token'), res as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('returns metrics with correct token', async () => {
    configService.get.mockReturnValue('valid-token');
    metrics.observeHttpRequest('GET', '/api/health', 200, 0.001);

    await controller.scrape(basicAuth('valid-token'), res as any);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      expect.stringContaining('text/plain'),
    );
    expect(res.send).toHaveBeenCalled();
    const sentText = res.send.mock.calls[0][0];
    expect(sentText).toContain(
      'http_requests_total{method="GET",route="/api/health",status_code="200"} 1',
    );
  });
});
