import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { SubscriptionLimitService } from './subscription-limit.service';

@Module({
  controllers: [BillingController],
  providers: [BillingService, SubscriptionLimitService],
  exports: [BillingService, SubscriptionLimitService],
})
export class BillingModule {}
