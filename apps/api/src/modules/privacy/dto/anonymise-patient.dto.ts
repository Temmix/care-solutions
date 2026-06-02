import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AnonymisePatientDto {
  /**
   * Safety check — the caller must echo back the patient's id to confirm the
   * irreversible erasure is intentional. Must equal the :id route param.
   */
  @IsString()
  @IsNotEmpty()
  confirmation!: string;

  /**
   * Reason for erasure (e.g. "Data subject erasure request 2026-06-02").
   * Captured in the audit log for accountability.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;
}
