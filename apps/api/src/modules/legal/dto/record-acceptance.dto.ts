import { IsEnum } from 'class-validator';
import { LegalDocumentType } from '@prisma/client';

export class RecordAcceptanceDto {
  @IsEnum(LegalDocumentType)
  documentType!: LegalDocumentType;
}
