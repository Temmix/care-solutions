import { IsString, IsEnum, IsOptional, IsDateString, Matches } from 'class-validator';
import { AvailabilityType } from '@prisma/client';

export class CreateAvailabilityDto {
  @IsDateString()
  date!: string;

  @IsEnum(AvailabilityType)
  type!: AvailabilityType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be in HH:mm format' })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be in HH:mm format' })
  endTime?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
