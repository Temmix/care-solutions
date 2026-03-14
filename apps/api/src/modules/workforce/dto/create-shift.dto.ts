import { IsString, IsDateString, IsOptional, MinLength } from 'class-validator';

export class CreateShiftDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  shiftPatternId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
