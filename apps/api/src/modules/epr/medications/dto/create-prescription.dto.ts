import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, MinLength } from 'class-validator';
import { MedicationRoute } from '@prisma/client';

export class CreatePrescriptionDto {
  @IsString()
  medicationId!: string;

  @IsString()
  patientId!: string;

  @IsString()
  @MinLength(1)
  dosageText!: string;

  @IsOptional()
  @IsString()
  dose?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsEnum(MedicationRoute)
  route?: MedicationRoute;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  reasonText?: string;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  asNeeded?: boolean;

  @IsOptional()
  @IsString()
  asNeededReason?: string;

  @IsOptional()
  @IsString()
  maxDosePerDay?: string;
}
