import { IsOptional, IsNumberString, IsBooleanString } from 'class-validator';

export class SearchNotificationsDto {
  @IsOptional()
  @IsBooleanString()
  unreadOnly?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
