import { IsString, IsNumber, IsOptional, IsUUID, IsISO8601 } from 'class-validator';

export class ClockOutDto {
  @IsUUID()
  @IsString()
  shiftAssignmentId!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Client-generated idempotency key for the clock-out. A replay with the same
   * key returns the already-clocked-out record instead of erroring, so the
   * mobile offline queue can retry safely.
   */
  @IsOptional()
  @IsUUID()
  clientEventId?: string;

  /**
   * When the clock-out actually happened on the device. Used instead of server
   * time so events captured offline and synced later record the true moment.
   */
  @IsOptional()
  @IsISO8601()
  capturedAt?: string;
}
