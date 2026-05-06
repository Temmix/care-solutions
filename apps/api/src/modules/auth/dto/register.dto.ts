import { IsEmail, IsString, MinLength, IsOptional, IsEnum, Matches } from 'class-validator';
import { Role, OrganizationType } from '@prisma/client';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsString()
  @MinLength(1)
  tenantName?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  organizationType?: OrganizationType;

  // Organisation contact & address (used when tenantName is provided)
  @IsOptional()
  @IsString()
  orgPhone?: string;

  @IsOptional()
  @IsEmail()
  orgEmail?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Identity verification fields (KYB) — optional at signup, can be filled later
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{6,8}$/, {
    message: 'companiesHouseNumber must be 6–8 alphanumeric characters',
  })
  companiesHouseNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^1-\d{6,12}$/, {
    message: 'cqcProviderId must be in the form "1-XXXXXXXX"',
  })
  cqcProviderId?: string;
}
