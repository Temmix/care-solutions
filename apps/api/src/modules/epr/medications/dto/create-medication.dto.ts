import { IsString, IsOptional, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { MedicationForm } from '@prisma/client';

export class CreateMedicationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsEnum(MedicationForm)
  form?: MedicationForm;

  @IsOptional()
  @IsString()
  strength?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
