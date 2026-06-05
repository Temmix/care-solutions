import { IsString, IsNumber, IsUUID, IsOptional, IsISO8601 } from 'class-validator';

export class ClockInDto {
  @IsUUID()
  @IsString()
  shiftAssignmentId!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;

  /**
   * Client-generated idempotency key. Lets the mobile offline queue safely
   * retry a clock-in without creating a duplicate record — a replay with the
   * same key returns the original record.
   */
  @IsOptional()
  @IsUUID()
  clientEventId?: string;

  /**
   * When the clock-in actually happened on the device. Used instead of server
   * time so events captured offline and synced later record the true moment.
   */
  @IsOptional()
  @IsISO8601()
  capturedAt?: string;
}
