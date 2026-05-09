import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsBootstrapService } from './metrics-bootstrap.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsBootstrapService],
  exports: [MetricsService],
})
export class MetricsModule {}
