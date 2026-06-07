import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '@care/logger';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Nest's getResponse() is either a string or an object like
    // { statusCode, message, error }. Surface the readable message (string or
    // string[]) so clients can display it directly instead of receiving a
    // nested object they can't parse (which previously masked 403/validation
    // errors as a generic "Something went wrong").
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message: string | string[] =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : ((exceptionResponse as { message?: string | string[] }).message ??
          'Internal server error');

    const user = request.user as { id?: string } | undefined;
    const tenantId = (request as unknown as Record<string, unknown>).tenantId as string | undefined;

    // Exception class name is bounded (a finite set of NestJS/domain errors)
    // and contains no PII — safe to use as a Prometheus label.
    const exceptionClass =
      (exception as { constructor?: { name?: string } })?.constructor?.name ?? 'Unknown';
    this.metrics.observeHttpException(status, exceptionClass);

    this.logger.logException(
      exception,
      {
        service: 'HttpExceptionFilter',
        method: `${request.method} ${request.url}`,
      },
      {
        userId: user?.id,
        tenantId,
        requestId: request.headers['x-request-id'] as string | undefined,
        metadata: {
          statusCode: status,
          path: request.url,
          method: request.method,
        },
      },
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
