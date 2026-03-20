import { IsString, IsOptional } from 'class-validator';

export class UpdateChcScreeningDto {
  @IsString()
  screeningOutcome!: string;

  @IsOptional()
  @IsString()
  screeningNotes?: string;
}
