import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { ChcFastTrackReason } from '@prisma/client';

export class CreateChcCaseDto {
  @IsString()
  patientId!: string;

  @IsOptional()
  @IsString()
  encounterId?: string;

  @IsString()
  referralReason!: string;

  @IsBoolean()
  isFastTrack!: boolean;

  @IsOptional()
  @IsEnum(ChcFastTrackReason)
  fastTrackReason?: ChcFastTrackReason;
}
