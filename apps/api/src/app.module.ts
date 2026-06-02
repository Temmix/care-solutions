import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { EprModule } from './modules/epr/epr.module';
import { BillingModule } from './modules/billing/billing.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { PatientFlowModule } from './modules/patient-flow/patient-flow.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { EventsModule } from './modules/events/events.module';
import { ChcModule } from './modules/chc/chc.module';
import { VirtualWardsModule } from './modules/virtual-wards/virtual-wards.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { IotModule } from './modules/iot/iot.module';
import { TrainingModule } from './modules/training/training.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RumModule } from './modules/rum/rum.module';
import { PrivacyModule } from './modules/privacy/privacy.module';
import { LoggerModule } from '@care/logger';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '.env'), // apps/api/.env
        join(__dirname, '..', '..', '..', '.env'), // monorepo root .env
      ],
    }),
    LoggerModule.forRoot({
      level: 'info',
      transports: [{ type: 'console' }, { type: 'file' }, { type: 'loki' }],
      fileOptions: { directory: './logs', prefix: 'care-api' },
      // Loki is opt-in via LOKI_URL env var. If unset, the loki transport
      // is silently skipped — keeps local dev working without a Loki
      // sidecar.
      lokiOptions: process.env.LOKI_URL
        ? {
            url: process.env.LOKI_URL,
            labels: {
              // `app` marks which Railway service the log came from.
              // Don't use `service` here — it's set per-entry to the
              // controller name (e.g. BillingController) for filtering.
              app: 'clinvara-api',
              env: process.env.RAILWAY_ENVIRONMENT_NAME ?? 'unknown',
            },
          }
        : undefined,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    EncryptionModule,
    EventsModule,
    AuthModule,
    UsersModule,
    FhirModule,
    EprModule,
    BillingModule,
    WorkforceModule,
    PatientFlowModule,
    MembershipsModule,
    ChcModule,
    VirtualWardsModule,
    AuditModule,
    NotificationsModule,
    ReportsModule,
    IotModule,
    TrainingModule,
    MetricsModule,
    RumModule,
    PrivacyModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
