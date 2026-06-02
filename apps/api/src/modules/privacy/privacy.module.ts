import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PatientAnonymizationService } from './patient-anonymization.service';
import { PatientDsarExportService } from './patient-dsar-export.service';

@Module({
  controllers: [PrivacyController],
  providers: [PatientAnonymizationService, PatientDsarExportService],
  exports: [PatientAnonymizationService, PatientDsarExportService],
})
export class PrivacyModule {}
