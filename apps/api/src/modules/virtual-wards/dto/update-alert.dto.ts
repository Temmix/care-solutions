import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum AlertAction {
  ACKNOWLEDGE = 'ACKNOWLEDGE',
  ESCALATE = 'ESCALATE',
  RESOLVE = 'RESOLVE',
}

export class UpdateAlertDto {
  @IsEnum(AlertAction)
  action!: AlertAction;

  @IsOptional()
  @IsString()
  escalatedToId?: string;

  @IsOptional()
  @IsString()
  resolveNotes?: string;
}
