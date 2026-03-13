import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateTenantAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;
}
