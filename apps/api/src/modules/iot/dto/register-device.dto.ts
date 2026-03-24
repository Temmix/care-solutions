import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @IsNotEmpty()
  serialNumber!: string;

  @IsEnum([
    'PULSE_OXIMETER',
    'BLOOD_PRESSURE_MONITOR',
    'THERMOMETER',
    'GLUCOMETER',
    'WEIGHT_SCALE',
    'WEARABLE',
    'SPIROMETER',
    'ECG_MONITOR',
    'OTHER',
  ])
  deviceType!: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;
}
