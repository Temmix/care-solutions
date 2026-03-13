import { Module } from '@nestjs/common';
import { FhirController } from './fhir.controller';

@Module({
  controllers: [FhirController],
})
export class FhirModule {}
