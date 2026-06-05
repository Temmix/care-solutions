import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { DevicePlatform } from '@prisma/client';

export class RegisterDeviceTokenDto {
  /** Expo push token, e.g. ExponentPushToken[xxxxxxxx]. */
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
