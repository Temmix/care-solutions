import { IsString } from 'class-validator';

export class AddPanelMemberDto {
  @IsString()
  userId!: string;

  @IsString()
  role!: string;
}
