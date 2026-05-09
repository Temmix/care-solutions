import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { LoggerService } from '@care/logger';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const controller = context.getClass().name;
    const handler = context.getHandler().name;
    const start = Date.now();

    const user = request.user as { id?: string } | undefined;
    const tenantId = (request as unknown as Record<string, unknown>).tenantId as string | undefined;
    const requestId = request.headers['x-request-id'] as string | undefined;

    const contextInfo = { service: controller, method: handler };
    const contextOptions = {
      userId: user?.id,
      tenantId,
      requestId,
      metadata: {
        httpMethod: request.method,
        path: request.url,
      },
    };

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.recordMetric(request, response.statusCode, duration);
        this.logger.info(
          `${request.method} ${request.url} completed in ${duration}ms`,
          contextInfo,
          {
            ...contextOptions,
            metadata: { ...contextOptions.metadata, duration },
          },
        );
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - start;
        const status =
          (error as { status?: number; getStatus?: () => number }).getStatus?.() ??
          (error as { status?: number }).status ??
          500;
        this.recordMetric(request, status, duration);
        this.logger.logException(error, contextInfo, {
          ...contextOptions,
          metadata: { ...contextOptions.metadata, duration },
        });
        return throwError(() => error);
      }),
    );
  }

  /**
   * Use the matched Express route TEMPLATE (e.g. `/api/patients/:id`) for the
   * Prometheus label, NEVER the raw URL. Raw paths contain UUIDs and other
   * high-cardinality / PII-laden segments that would explode the cardinality
   * budget and risk leaking patient identifiers into the metrics store.
   */
  private recordMetric(request: Request, statusCode: number, durationMs: number): void {
    const route = (request.route as { path?: string } | undefined)?.path ?? 'unknown';
    this.metrics.observeHttpRequest(request.method, route, statusCode, durationMs / 1000);
  }
}
