import { IsString, IsOptional, MinLength } from 'class-validator';

export class CreateBedDto {
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  @MinLength(1)
  locationId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
