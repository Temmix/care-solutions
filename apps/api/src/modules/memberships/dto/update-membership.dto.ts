import { IsEnum, IsOptional } from 'class-validator';
import { Role, MembershipStatus } from '@prisma/client';

export class UpdateMembershipDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
