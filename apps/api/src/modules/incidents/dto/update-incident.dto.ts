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
import { IncidentCategory, IncidentSeverity, IncidentStatus } from '@prisma/client';

export class UpdateIncidentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(IncidentCategory)
  category?: IncidentCategory;

  @IsOptional()
  @IsEnum(IncidentSeverity)
  severity?: IncidentSeverity;

  @IsOptional()
  @IsEnum(IncidentStatus)
  status?: IncidentStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  affectedDataSubjects?: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsBoolean()
  icoReportable?: boolean;

  /** Set true to record that the incident has been reported to the ICO now. */
  @IsOptional()
  @IsBoolean()
  icoReported?: boolean;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
