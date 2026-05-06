import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ResetVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
