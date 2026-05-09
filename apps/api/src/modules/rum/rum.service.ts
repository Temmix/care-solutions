import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@care/logger';
import { MetricsService } from '../metrics/metrics.service';
import { WebVitalDto, JsErrorDto } from './dto/rum-payload.dto';

@Injectable()
export class RumService {
  constructor(
    @Inject(MetricsService) private metrics: MetricsService,
    @Inject(LoggerService) private logger: LoggerService,
  ) {}

  recordWebVital(payload: WebVitalDto): void {
    this.metrics.observeRumWebVital(payload.metric, payload.page, payload.rating, payload.value);
  }

  recordJsError(payload: JsErrorDto, userId?: string, tenantId?: string): void {
    this.metrics.observeRumJsError(payload.page);
    // Log the message + stack for debugging — these never enter Prometheus
    // labels (count-only) so they're safe to keep in app logs.
    this.logger.warn(
      `RUM JS error on ${payload.page}: ${payload.message ?? '(no message)'}`,
      { service: 'RumService', method: 'recordJsError' },
      {
        userId,
        tenantId,
        metadata: { page: payload.page, stack: payload.stack },
      },
    );
  }
}
