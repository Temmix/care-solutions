import { IsString } from 'class-validator';

export class AddChcNoteDto {
  @IsString()
  content!: string;
}
