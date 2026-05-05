import { IsString, IsNumber, IsUUID } from 'class-validator';

export class ClockInDto {
  @IsUUID()
  @IsString()
  shiftAssignmentId!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}
