import { IsEnum, IsOptional, IsString, IsNumberString } from 'class-validator';
import { ChcStatus } from '@prisma/client';

export class SearchChcCasesDto {
  @IsOptional()
  @IsEnum(ChcStatus)
  status?: ChcStatus;

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
