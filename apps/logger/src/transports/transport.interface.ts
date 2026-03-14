import type { LogEntry } from '../types';

export interface LogTransport {
  readonly name: string;
  write(entry: LogEntry): void | Promise<void>;
  close?(): void | Promise<void>;
}
