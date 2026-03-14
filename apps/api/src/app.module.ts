import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { FhirModule } from './modules/fhir/fhir.module';
import { EprModule } from './modules/epr/epr.module';
import { BillingModule } from './modules/billing/billing.module';
import { WorkforceModule } from './modules/workforce/workforce.module';
import { PatientFlowModule } from './modules/patient-flow/patient-flow.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
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
      transports: [{ type: 'console' }, { type: 'file' }],
      fileOptions: { directory: './logs', prefix: 'care-api' },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    FhirModule,
    EprModule,
    BillingModule,
    WorkforceModule,
    PatientFlowModule,
    MembershipsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
