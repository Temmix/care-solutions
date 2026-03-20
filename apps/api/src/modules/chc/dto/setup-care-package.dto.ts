import { IsDateString, IsOptional, IsString } from 'class-validator';

export class SetupCarePackageDto {
  @IsOptional()
  @IsString()
  carePlanId?: string;

  @IsDateString()
  carePackageStartDate!: string;

  @IsOptional()
  @IsDateString()
  annualReviewDate?: string;
}
