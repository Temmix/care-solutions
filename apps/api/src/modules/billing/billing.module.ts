import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionLimitService } from './subscription-limit.service';
import { TrialReminderService } from './trial-reminder.service';
import { TenantVerificationController } from './tenant-verification.controller';
import { TenantVerificationService } from './tenant-verification.service';

@Module({
  controllers: [BillingController, TenantVerificationController],
  providers: [
    BillingService,
    SubscriptionLimitService,
    TrialReminderService,
    TenantVerificationService,
  ],
  exports: [BillingService, SubscriptionLimitService],
})
export class BillingModule {}
