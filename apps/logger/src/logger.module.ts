import { Module, Global, type DynamicModule } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { FileTransport, type FileTransportOptions } from './transports/file.transport';
import { ConsoleTransport } from './transports/console.transport';
import type { LogLevel, TransportConfig } from './types';

export interface LoggerModuleOptions {
  level?: LogLevel;
  transports?: TransportConfig[];
  fileOptions?: FileTransportOptions;
}

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LoggerService,
          useFactory: (): LoggerService => {
            const logger = new LoggerService();
            logger.setLevel(options.level ?? 'info');

            const transportConfigs = options.transports ?? [{ type: 'console' }, { type: 'file' }];

            for (const config of transportConfigs) {
              switch (config.type) {
                case 'file':
                  logger.addTransport(
                    new FileTransport(
                      options.fileOptions ?? {
                        directory: './logs',
                        prefix: 'care-api',
                      },
                    ),
                  );
                  break;
                case 'console':
                  logger.addTransport(new ConsoleTransport());
                  break;
                // Future: case 'database', case 'splunk'
              }
            }

            return logger;
          },
        },
      ],
      exports: [LoggerService],
    };
  }
}
