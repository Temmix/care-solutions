import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { LoggerService } from '@care/logger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { MetricsService } from './modules/metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api');
  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const loggerService = app.get(LoggerService);
  const metricsService = app.get(MetricsService);
  app.useGlobalFilters(new GlobalExceptionFilter(loggerService, metricsService));
  app.useGlobalInterceptors(new LoggingInterceptor(loggerService, metricsService));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || configService.get<number>('API_PORT', 3000);

  await app.listen(port, '::');
  console.log(`API running on port ${port} (IPv4+IPv6)`);
}

bootstrap();
