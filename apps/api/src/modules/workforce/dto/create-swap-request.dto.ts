import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateSwapRequestDto {
  @IsString()
  @MinLength(1)
  originalShiftAssignmentId!: string;

  @IsOptional()
  @IsString()
  targetShiftAssignmentId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
