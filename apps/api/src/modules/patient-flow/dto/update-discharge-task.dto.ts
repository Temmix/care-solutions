import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DischargeTaskStatus } from '@prisma/client';

export class UpdateDischargeTaskDto {
  @IsOptional()
  @IsEnum(DischargeTaskStatus)
  status?: DischargeTaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
