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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const user = request.user as { id?: string } | undefined;
    const tenantId = (request as unknown as Record<string, unknown>).tenantId as string | undefined;

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
      message: typeof message === 'string' ? message : (message as Record<string, unknown>),
      timestamp: new Date().toISOString(),
    });
  }
}
