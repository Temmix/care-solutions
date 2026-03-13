import { IsString, IsEnum, IsOptional, IsDateString, MinLength, IsObject } from 'class-validator';
import { PatientEventType } from '@prisma/client';

export class CreatePatientEventDto {
  @IsEnum(PatientEventType)
  eventType!: PatientEventType;

  @IsString()
  @MinLength(1)
  summary!: string;

  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  careSetting?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
