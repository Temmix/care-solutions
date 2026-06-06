import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsUrl,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { SubProcessorStatus } from '@prisma/client';

export class UpdateSubProcessorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  purpose?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(SubProcessorStatus)
  status?: SubProcessorStatus;

  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
