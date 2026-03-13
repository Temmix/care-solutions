import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  IsDateString,
  MinLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, ContactRelationship } from '@prisma/client';

export class CreatePatientContactDto {
  @IsEnum(ContactRelationship)
  relationship!: ContactRelationship;

  @IsString()
  @MinLength(1)
  givenName!: string;

  @IsString()
  @MinLength(1)
  familyName!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  givenName!: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsString()
  @MinLength(1)
  familyName!: string;

  @IsOptional()
  @IsString()
  prefix?: string;

  @IsEnum(Gender)
  gender!: Gender;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  nhsNumber?: string;

  @IsOptional()
  @IsString()
  mrn?: string;

  @IsOptional()
  @IsString()
  managingOrganizationId?: string;

  @IsOptional()
  @IsString()
  gpPractitionerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePatientContactDto)
  contacts?: CreatePatientContactDto[];
}
