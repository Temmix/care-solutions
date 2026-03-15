import { IsDateString } from 'class-validator';

export class ComplianceQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;
}
