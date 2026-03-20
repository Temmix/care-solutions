import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { ChcController } from './chc.controller';
import { ChcService } from './chc.service';

@Module({
  imports: [EventsModule],
  controllers: [ChcController],
  providers: [ChcService],
  exports: [ChcService],
})
export class ChcModule {}
