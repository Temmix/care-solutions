import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { LogTransport } from './transports/transport.interface';
import type { LogEntry, LogLevel } from './types';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

@Injectable()
export class LoggerService implements OnModuleDestroy {
  private transports: LogTransport[] = [];
  private level: LogLevel = 'info';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  error(
    message: string,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'error' | 'metadata' | 'requestId'>>,
  ): void {
    this.log('error', message, context, options);
  }

  warn(
    message: string,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'error' | 'metadata' | 'requestId'>>,
  ): void {
    this.log('warn', message, context, options);
  }

  info(
    message: string,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'error' | 'metadata' | 'requestId'>>,
  ): void {
    this.log('info', message, context, options);
  }

  debug(
    message: string,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'error' | 'metadata' | 'requestId'>>,
  ): void {
    this.log('debug', message, context, options);
  }

  /**
   * Log from an caught exception, extracting error details automatically.
   */
  logException(
    exception: unknown,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'metadata' | 'requestId'>>,
  ): void {
    const errorDetails = this.extractError(exception);
    this.log('error', errorDetails.message, context, {
      ...options,
      error: errorDetails,
    });
  }

  private log(
    level: LogLevel,
    message: string,
    context: { service: string; method: string },
    options?: Partial<Pick<LogEntry, 'userId' | 'tenantId' | 'error' | 'metadata' | 'requestId'>>,
  ): void {
    if (LEVEL_PRIORITY[level] > LEVEL_PRIORITY[this.level]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: context.service,
      method: context.method,
      ...options,
    };

    for (const transport of this.transports) {
      try {
        transport.write(entry);
      } catch {
        // Avoid recursive logging — write to stderr as last resort
        process.stderr.write(`[LoggerService] Transport "${transport.name}" failed: ${message}\n`);
      }
    }
  }

  private extractError(exception: unknown): NonNullable<LogEntry['error']> {
    if (exception instanceof Error) {
      return {
        name: exception.constructor.name,
        message: exception.message,
        stack: exception.stack,
        statusCode:
          'getStatus' in exception &&
          typeof (exception as Record<string, unknown>).getStatus === 'function'
            ? (exception as { getStatus(): number }).getStatus()
            : undefined,
      };
    }

    return {
      name: 'UnknownError',
      message: String(exception),
    };
  }

  async onModuleDestroy(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.close) {
        await transport.close();
      }
    }
  }
}
