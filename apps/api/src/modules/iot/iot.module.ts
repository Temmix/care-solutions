import { Module } from '@nestjs/common';
import { VirtualWardsModule } from '../virtual-wards/virtual-wards.module';
import { EventsModule } from '../events/events.module';
import { IotController } from './iot.controller';
import { IotIngestionController } from './iot-ingestion.controller';
import { IotService } from './iot.service';
import { IotIngestionService } from './iot-ingestion.service';
import { ApiKeyGuard } from './guards/api-key.guard';

@Module({
  imports: [VirtualWardsModule, EventsModule],
  controllers: [IotController, IotIngestionController],
  providers: [IotService, IotIngestionService, ApiKeyGuard],
})
export class IotModule {}
