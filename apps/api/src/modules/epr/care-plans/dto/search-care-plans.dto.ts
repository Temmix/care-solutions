import { IsString, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { CarePlanStatus, CarePlanCategory } from '@prisma/client';

export class SearchCarePlansDto {
  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsEnum(CarePlanStatus)
  status?: CarePlanStatus;

  @IsOptional()
  @IsEnum(CarePlanCategory)
  category?: CarePlanCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
