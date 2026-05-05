import { IsString, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class ClockOutDto {
  @IsUUID()
  @IsString()
  shiftAssignmentId!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
