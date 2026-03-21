import { IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';
import { VitalType } from '@prisma/client';

export class RecordObservationDto {
  @IsEnum(VitalType)
  vitalType!: VitalType;

  @IsNumber()
  value!: number;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
