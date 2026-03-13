import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CarePlanCategory } from '@prisma/client';
import { CreateGoalDto } from './create-goal.dto';
import { CreateActivityDto } from './create-activity.dto';

export class CreateCarePlanDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(CarePlanCategory)
  category!: CarePlanCategory;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @IsString()
  patientId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateGoalDto)
  goals?: CreateGoalDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityDto)
  activities?: CreateActivityDto[];
}
