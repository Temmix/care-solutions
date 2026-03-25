import { IsString, IsOptional, IsInt, Min, Matches } from 'class-validator';

export class CreateTrainingTypeDto {
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, {
    message: 'code must be uppercase letters, digits, and underscores (e.g. FIRE_SAFETY)',
  })
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
