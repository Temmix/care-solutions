import { IsString, IsOptional } from 'class-validator';

export class DischargeVwDto {
  @IsString()
  dischargeReason!: string;

  @IsOptional()
  @IsString()
  clinicalSummary?: string;
}
