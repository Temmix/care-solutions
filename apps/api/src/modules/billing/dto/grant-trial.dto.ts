import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class GrantTrialDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
