import { Controller, Post, Body, UseGuards, Req, Inject } from '@nestjs/common';
import { IotIngestionService } from './iot-ingestion.service';
import { IngestReadingsDto } from './dto';
import { ApiKeyGuard } from './guards/api-key.guard';

@Controller('iot')
@UseGuards(ApiKeyGuard)
export class IotIngestionController {
  constructor(@Inject(IotIngestionService) private ingestionService: IotIngestionService) {}

  @Post('ingest')
  ingest(
    @Body() dto: IngestReadingsDto,
    @Req() req: { tenantId: string; apiKeyDeviceId: string | null },
  ) {
    return this.ingestionService.ingest(dto, req.tenantId, req.apiKeyDeviceId);
  }
}
