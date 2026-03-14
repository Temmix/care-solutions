export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  method: string;
  userId?: string;
  tenantId?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
    statusCode?: number;
  };
  metadata?: Record<string, unknown>;
  requestId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  transports: TransportConfig[];
}

export interface TransportConfig {
  type: 'file' | 'console' | 'database' | 'splunk';
  options?: Record<string, unknown>;
}
