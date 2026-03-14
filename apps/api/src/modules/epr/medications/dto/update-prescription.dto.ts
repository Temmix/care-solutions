import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, MinLength } from 'class-validator';
import { MedicationRequestStatus, MedicationRoute } from '@prisma/client';

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsEnum(MedicationRequestStatus)
  status?: MedicationRequestStatus;

  @IsOptional()
  @IsString()
  @MinLength(1)
  dosageText?: string;

  @IsOptional()
  @IsString()
  dose?: string;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsEnum(MedicationRoute)
  route?: MedicationRoute;

  @IsOptional()
  @IsDateString()
  startDate?: string;

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
