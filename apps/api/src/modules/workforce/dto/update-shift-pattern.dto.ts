import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  MinLength,
  Matches,
} from 'class-validator';
import { ShiftType } from '@prisma/client';

export class UpdateShiftPatternDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEnum(ShiftType)
  shiftType?: ShiftType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
