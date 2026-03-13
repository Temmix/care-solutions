import { IsString, IsEnum, IsOptional, IsDateString, IsInt, Min, Matches } from 'class-validator';
import { RiskLevel } from '@prisma/client';

export class CreateAssessmentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'assessmentType must be an uppercase code (e.g. FALLS_RISK)',
  })
  assessmentType!: string;

  @IsOptional()
  @IsString()
  toolName?: string;

  @IsString()
  patientId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  score?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxScore?: number;

  @IsOptional()
  @IsString()
  scoreInterpretation?: string;

  @IsOptional()
  @IsEnum(RiskLevel)
  riskLevel?: RiskLevel;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  recommendedActions?: string;

  @IsOptional()
  responses?: unknown;
}
