import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProcessingPurpose, LawfulBasisArticle6, LawfulBasisArticle9 } from '@prisma/client';

export class UpsertProcessingBasisDto {
  @IsEnum(ProcessingPurpose)
  purpose!: ProcessingPurpose;

  @IsEnum(LawfulBasisArticle6)
  article6Basis!: LawfulBasisArticle6;

  /** Required when the processing involves special-category (health) data. */
  @IsOptional()
  @IsEnum(LawfulBasisArticle9)
  article9Condition?: LawfulBasisArticle9;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
