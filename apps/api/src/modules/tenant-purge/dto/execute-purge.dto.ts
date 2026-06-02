import { IsString, IsNotEmpty, MaxLength, IsOptional, IsBoolean } from 'class-validator';

export class ExecutePurgeDto {
  /** Must echo the tenant id being purged — guards against accidental execution. */
  @IsString()
  @IsNotEmpty()
  confirmation!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  /** When true, returns what would be deleted without deleting anything. */
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
