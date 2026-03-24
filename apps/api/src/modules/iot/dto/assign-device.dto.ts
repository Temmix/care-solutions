import { IsNotEmpty, IsString } from 'class-validator';

export class AssignDeviceDto {
  @IsString()
  @IsNotEmpty()
  enrolmentId!: string;
}
