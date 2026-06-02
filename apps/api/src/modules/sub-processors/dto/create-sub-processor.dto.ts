import { IsString, IsNotEmpty, MaxLength, IsOptional, IsUrl, IsDateString } from 'class-validator';

export class CreateSubProcessorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  purpose!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location!: string;

  @IsOptional()
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  /** When the addition takes effect. Defaults to now + the notice period. */
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;
}
