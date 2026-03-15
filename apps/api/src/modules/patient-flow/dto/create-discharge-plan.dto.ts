import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateDischargePlanDto {
  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
