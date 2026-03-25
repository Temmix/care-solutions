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

export class CreateTrainingRecordDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsEnum(TrainingPriority)
  priority?: TrainingPriority;

  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @IsString()
  @MinLength(1)
  userId!: string;

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
