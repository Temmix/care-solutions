import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  measure?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
