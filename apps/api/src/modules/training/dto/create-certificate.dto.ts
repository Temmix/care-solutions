import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class CreateCertificateDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  issuer!: string;

  @IsOptional()
  @IsString()
  certificateNumber?: string;

  @IsDateString()
  issueDate!: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
