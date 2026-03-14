import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DischargeDestination } from '@prisma/client';

export class DischargeDto {
  @IsEnum(DischargeDestination)
  destination!: DischargeDestination;

  @IsOptional()
  @IsString()
  notes?: string;
}
