import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ExtendTrialDto {
  @IsInt()
  @Min(1)
  @Max(365)
  additionalDays!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
