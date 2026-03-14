import type { LogEntry, LogLevel } from '../types';
import type { LogTransport } from './transport.interface';

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // red
  warn: '\x1b[33m', // yellow
  info: '\x1b[36m', // cyan
  debug: '\x1b[90m', // gray
};

const RESET = '\x1b[0m';

export class ConsoleTransport implements LogTransport {
  readonly name = 'console';

  write(entry: LogEntry): void {
    const color = LEVEL_COLORS[entry.level];
    const level = entry.level.toUpperCase().padEnd(5);
    const prefix = `${color}[${level}]${RESET}`;
    const context = `${entry.service}.${entry.method}`;
    const tenant = entry.tenantId ? ` tenant=${entry.tenantId}` : '';
    const user = entry.userId ? ` user=${entry.userId}` : '';
    const reqId = entry.requestId ? ` req=${entry.requestId}` : '';

    const line = `${prefix} ${entry.timestamp} [${context}]${tenant}${user}${reqId} ${entry.message}`;

    if (entry.level === 'error') {
      console.error(line);
      if (entry.error?.stack) {
        console.error(`  ${entry.error.stack}`);
      }
    } else if (entry.level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
}
