import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DischargeTaskType } from '@prisma/client';

export class CreateDischargeTaskDto {
  @IsEnum(DischargeTaskType)
  type!: DischargeTaskType;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
