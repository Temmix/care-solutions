import { IsString, IsEnum, IsOptional, IsInt, Min, MinLength } from 'class-validator';
import { LocationType } from '@prisma/client';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;
}
