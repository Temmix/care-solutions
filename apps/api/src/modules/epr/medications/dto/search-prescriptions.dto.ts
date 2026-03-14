import { IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MedicationRequestStatus } from '@prisma/client';

export class SearchPrescriptionsDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsString()
  medicationId?: string;

  @IsOptional()
  @IsEnum(MedicationRequestStatus)
  status?: MedicationRequestStatus;

  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
