import { RumService } from '../src/modules/rum/rum.service';

describe('RumService', () => {
  let service: RumService;
  let metrics: { observeRumWebVital: jest.Mock; observeRumJsError: jest.Mock };
  let logger: { warn: jest.Mock };

  beforeEach(() => {
    metrics = {
      observeRumWebVital: jest.fn(),
      observeRumJsError: jest.fn(),
    };
    logger = { warn: jest.fn() };
    service = new RumService(metrics as any, logger as any);
  });

  describe('recordWebVital', () => {
    it('forwards each field to MetricsService.observeRumWebVital', () => {
      service.recordWebVital({
        kind: 'web-vital',
        page: '/app/patients/:id',
        metric: 'LCP',
        value: 1234,
        rating: 'good',
      });
      expect(metrics.observeRumWebVital).toHaveBeenCalledWith(
        'LCP',
        '/app/patients/:id',
        'good',
        1234,
      );
    });
  });

  describe('recordJsError', () => {
    it('counts the error AND logs the message + stack (logs are not metric labels)', () => {
      service.recordJsError(
        {
          kind: 'js-error',
          page: '/app/billing',
          message: 'Cannot read property foo of undefined',
          stack: 'at someFn (file.ts:42)',
        },
        'user-1',
        'tenant-1',
      );

      expect(metrics.observeRumJsError).toHaveBeenCalledWith('/app/billing');
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('/app/billing'),
        { service: 'RumService', method: 'recordJsError' },
        expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          metadata: expect.objectContaining({
            page: '/app/billing',
            stack: 'at someFn (file.ts:42)',
          }),
        }),
      );
    });

    it('handles missing message + stack gracefully', () => {
      service.recordJsError({ kind: 'js-error', page: '/app' });
      expect(metrics.observeRumJsError).toHaveBeenCalledWith('/app');
      expect(logger.warn).toHaveBeenCalled();
    });
  });
});
