import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { setupPrismaMetricsMiddleware } from '../../prisma/metrics.middleware';
import { MetricsService } from './metrics.service';

/**
 * Registers the Prisma metrics middleware on app startup.
 *
 * MetricsModule is imported AFTER EncryptionModule in app.module.ts, so
 * onModuleInit fires after EncryptionBootstrapService — meaning the
 * encryption middleware is already registered (outer) and this metrics
 * middleware sits inner, measuring pure DB time. Encryption time is its
 * own metric, recorded inside the encryption middleware.
 */
@Injectable()
export class MetricsBootstrapService implements OnModuleInit {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MetricsService) private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    setupPrismaMetricsMiddleware(this.prisma, this.metrics);
  }
}
