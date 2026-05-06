import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateTenantIdentityDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{6,8}$/, {
    message: 'companiesHouseNumber must be 6–8 alphanumeric characters (e.g. "12345678")',
  })
  companiesHouseNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^1-\d{6,12}$/, {
    message: 'cqcProviderId must be in the form "1-XXXXXXXX"',
  })
  cqcProviderId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  odsCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  verificationNotes?: string;
}
