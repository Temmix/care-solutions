import { IsString, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateMembershipDto {
  @IsString()
  organizationId!: string;

  @IsEnum(Role)
  role!: Role;
}
