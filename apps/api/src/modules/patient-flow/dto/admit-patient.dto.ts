import { IsString, IsEnum, IsOptional, MinLength } from 'class-validator';
import { EncounterClass, AdmissionSource } from '@prisma/client';

export class AdmitPatientDto {
  @IsString()
  @MinLength(1)
  patientId!: string;

  @IsOptional()
  @IsEnum(EncounterClass)
  class?: EncounterClass;

  @IsOptional()
  @IsEnum(AdmissionSource)
  admissionSource?: AdmissionSource;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  bedId?: string;

  @IsOptional()
  @IsString()
  primaryPractitionerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
