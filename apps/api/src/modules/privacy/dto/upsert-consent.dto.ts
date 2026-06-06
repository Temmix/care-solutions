import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConsentType, ConsentStatus } from '@prisma/client';

export class UpsertConsentDto {
  @IsEnum(ConsentType)
  type!: ConsentType;

  @IsEnum(ConsentStatus)
  status!: ConsentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
