import { Module } from '@nestjs/common';
import { PrivacyController } from './privacy.controller';
import { PatientAnonymizationService } from './patient-anonymization.service';

@Module({
  controllers: [PrivacyController],
  providers: [PatientAnonymizationService],
  exports: [PatientAnonymizationService],
})
export class PrivacyModule {}
