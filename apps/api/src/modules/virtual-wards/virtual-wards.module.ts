import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { VirtualWardsController } from './virtual-wards.controller';
import { VirtualWardsService } from './virtual-wards.service';

@Module({
  imports: [EventsModule],
  controllers: [VirtualWardsController],
  providers: [VirtualWardsService],
  exports: [VirtualWardsService],
})
export class VirtualWardsModule {}
