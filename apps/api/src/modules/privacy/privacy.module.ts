import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { ConsentController } from './consent.controller';
import { PatientAnonymizationService } from './patient-anonymization.service';
import { PatientDsarExportService } from './patient-dsar-export.service';
import { ConsentService } from './consent.service';

@Module({
  controllers: [PrivacyController, ConsentController],
  providers: [PatientAnonymizationService, PatientDsarExportService, ConsentService],
  exports: [PatientAnonymizationService, PatientDsarExportService, ConsentService],
})
export class PrivacyModule {}
