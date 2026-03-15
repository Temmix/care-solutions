import { IsString, MinLength } from 'class-validator';

export class RespondSwapDto {
  @IsString()
  @MinLength(1)
  targetShiftAssignmentId!: string;
}
