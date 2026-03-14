import { IsString, IsEnum, IsOptional, IsInt, Min, MinLength } from 'class-validator';
import { LocationType } from '@prisma/client';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(LocationType)
  type!: LocationType;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}
