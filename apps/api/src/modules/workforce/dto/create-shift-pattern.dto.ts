import { IsString, IsEnum, IsOptional, IsInt, Min, MinLength, Matches } from 'class-validator';
import { ShiftType } from '@prisma/client';

export class CreateShiftPatternDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(ShiftType)
  shiftType!: ShiftType;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  breakMinutes?: number;

  @IsOptional()
  @IsString()
  color?: string;
}
