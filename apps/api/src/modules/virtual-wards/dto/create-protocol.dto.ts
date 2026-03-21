import { IsEnum, IsInt, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { VitalType, AlertSeverity } from '@prisma/client';

export class ThresholdDto {
  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;
}

export class CreateProtocolDto {
  @IsEnum(VitalType)
  vitalType!: VitalType;

  @IsInt()
  frequencyHours!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  thresholds!: ThresholdDto[];
}
