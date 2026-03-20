import { IsString, IsOptional } from 'class-validator';

export class EnrolPatientDto {
  @IsString()
  patientId!: string;

  @IsString()
  encounterId!: string;

  @IsOptional()
  @IsString()
  clinicalSummary?: string;
}
