import { IsString, IsOptional, MinLength } from 'class-validator';

export class AssignShiftDto {
  @IsString()
  @MinLength(1)
  userId!: string;

  @IsOptional()
  @IsString()
  role?: string;
}
