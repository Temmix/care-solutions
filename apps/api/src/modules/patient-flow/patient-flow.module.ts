import { Module } from '@nestjs/common';
import { PatientFlowController } from './patient-flow.controller';
import { PatientFlowService } from './patient-flow.service';

@Module({
  controllers: [PatientFlowController],
  providers: [PatientFlowService],
  exports: [PatientFlowService],
})
export class PatientFlowModule {}
