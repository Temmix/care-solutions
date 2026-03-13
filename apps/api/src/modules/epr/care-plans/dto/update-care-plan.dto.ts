import { IsString, IsEnum, IsOptional, IsDateString, MinLength } from 'class-validator';
import { CarePlanStatus, CarePlanCategory } from '@prisma/client';

export class UpdateCarePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(CarePlanStatus)
  status?: CarePlanStatus;

  @IsOptional()
  @IsEnum(CarePlanCategory)
  category?: CarePlanCategory;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}
