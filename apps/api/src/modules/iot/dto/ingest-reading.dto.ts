import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReadingDto {
  @IsString()
  @IsNotEmpty()
  deviceSerialNumber!: string;

  @IsEnum([
    'HEART_RATE',
    'BLOOD_PRESSURE_SYSTOLIC',
    'BLOOD_PRESSURE_DIASTOLIC',
    'TEMPERATURE',
    'RESPIRATORY_RATE',
    'OXYGEN_SATURATION',
    'BLOOD_GLUCOSE',
    'WEIGHT',
    'PAIN_SCORE',
  ])
  vitalType!: string;

  @IsNumber()
  value!: number;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsOptional()
  @IsDateString()
  recordedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;
}

export class IngestReadingsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ReadingDto)
  readings!: ReadingDto[];
}
