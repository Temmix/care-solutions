import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { MedicationAdminStatus, MedicationRoute } from '@prisma/client';

export class CreateAdministrationDto {
  @IsString()
  requestId!: string;

  @IsOptional()
  @IsEnum(MedicationAdminStatus)
  status?: MedicationAdminStatus;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  doseGiven?: string;

  @IsOptional()
  @IsEnum(MedicationRoute)
  route?: MedicationRoute;

  @IsOptional()
  @IsString()
  site?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  notGivenReason?: string;
}
