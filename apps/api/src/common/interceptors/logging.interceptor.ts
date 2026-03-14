import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request } from 'express';
import { LoggerService } from '@care/logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
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
        this.logger.logException(error, contextInfo, {
          ...contextOptions,
          metadata: { ...contextOptions.metadata, duration },
        });
        return throwError(() => error);
      }),
    );
  }
}
