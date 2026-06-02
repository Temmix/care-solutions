import { Module } from '@nestjs/common';
import { TenantPurgeController } from './tenant-purge.controller';
import { TenantPurgeService } from './tenant-purge.service';

@Module({
  controllers: [TenantPurgeController],
  providers: [TenantPurgeService],
  exports: [TenantPurgeService],
})
export class TenantPurgeModule {}
