import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsNumber,
  IsDateString,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { TrainingPriority, TrainingStatus } from '@prisma/client';

export class UpdateTrainingRecordDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(TrainingPriority)
  priority?: TrainingPriority;

  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsDateString()
  startedDate?: string;

  @IsOptional()
  @IsDateString()
  completedDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  renewalPeriodMonths?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursCompleted?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
