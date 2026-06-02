import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { IncidentCategory, IncidentSeverity } from '@prisma/client';

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @IsEnum(IncidentCategory)
  category!: IncidentCategory;

  @IsEnum(IncidentSeverity)
  severity!: IncidentSeverity;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsDateString()
  discoveredAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  affectedDataSubjects?: number;

  @IsOptional()
  @IsBoolean()
  icoReportable?: boolean;
}
