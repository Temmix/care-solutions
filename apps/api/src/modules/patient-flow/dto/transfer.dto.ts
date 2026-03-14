import { IsString, IsOptional, MinLength } from 'class-validator';

export class TransferDto {
  @IsString()
  @MinLength(1)
  toLocationId!: string;

  @IsOptional()
  @IsString()
  toBedId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
