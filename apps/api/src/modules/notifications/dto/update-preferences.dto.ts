import { IsArray, ValidateNested, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationChannel } from '@prisma/client';

export class PreferenceItem {
  @IsEnum(NotificationType)
  eventType!: NotificationType;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdatePreferencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreferenceItem)
  preferences!: PreferenceItem[];
}
