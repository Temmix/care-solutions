import { IsString, IsEnum, IsOptional, IsInt, Min } from 'class-validator';
import { TrainingPriority, TrainingStatus } from '@prisma/client';
import { Type } from 'class-transformer';

export class SearchTrainingDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(TrainingStatus)
  status?: TrainingStatus;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(TrainingPriority)
  priority?: TrainingPriority;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
