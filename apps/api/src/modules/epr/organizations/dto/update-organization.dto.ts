import { IsString, IsEnum, IsOptional, IsBoolean, IsArray, IsIn } from 'class-validator';
import { OrganizationType } from '@prisma/client';
import { MODULE_CODES } from '@care/shared';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(OrganizationType)
  type?: OrganizationType;

  @IsOptional()
  @IsString()
  odsCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

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
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn([...MODULE_CODES], { each: true })
  enabledModules?: string[];
}
