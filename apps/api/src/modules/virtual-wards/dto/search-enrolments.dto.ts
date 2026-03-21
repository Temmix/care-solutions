import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { VirtualWardStatus } from '@prisma/client';

export class SearchEnrolmentsDto {
  @IsOptional()
  @IsEnum(VirtualWardStatus)
  status?: VirtualWardStatus;

  @IsOptional()
  @IsString()
  patientId?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
