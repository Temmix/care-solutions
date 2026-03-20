import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ChcDecision, ChcFundingBand } from '@prisma/client';

export class RecordChcDecisionDto {
  @IsEnum(ChcDecision)
  decision!: ChcDecision;

  @IsOptional()
  @IsEnum(ChcFundingBand)
  fundingBand?: ChcFundingBand;

  @IsOptional()
  @IsString()
  decisionNotes?: string;
}
