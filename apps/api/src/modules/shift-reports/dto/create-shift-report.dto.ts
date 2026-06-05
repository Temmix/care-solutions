import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsObject,
  IsISO8601,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ShiftReportCategory, ShiftReportPriority } from '@prisma/client';

export class CreateShiftReportDto {
  @IsUUID()
  shiftAssignmentId!: string;

  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsEnum(ShiftReportCategory)
  category?: ShiftReportCategory;

  @IsOptional()
  @IsEnum(ShiftReportPriority)
  priority?: ShiftReportPriority;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content!: string;

  /** Structured fields (phase 2). Free-form for now. */
  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;

  /** Offline idempotency key — a replay with the same key returns the original. */
  @IsOptional()
  @IsUUID()
  clientEventId?: string;

  /** When the report was written on the device; used for the window check. */
  @IsOptional()
  @IsISO8601()
  capturedAt?: string;
}
