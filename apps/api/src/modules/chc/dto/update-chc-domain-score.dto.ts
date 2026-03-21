import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ChcDomain, ChcDomainLevel } from '@prisma/client';

export class UpdateChcDomainScoreDto {
  @IsEnum(ChcDomain)
  domain!: ChcDomain;

  @IsEnum(ChcDomainLevel)
  level!: ChcDomainLevel;

  @IsOptional()
  @IsString()
  evidence?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
