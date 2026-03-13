import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
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
}
