import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreatePractitionerDto {
  @IsString()
  @MinLength(1)
  givenName!: string;

  @IsString()
  @MinLength(1)
  familyName!: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  @IsString()
  userId!: string;
}
