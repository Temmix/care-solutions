import { IsEnum, IsOptional, IsString } from 'class-validator';

export class DeviceQueryDto {
  @IsOptional()
  @IsEnum(['REGISTERED', 'ACTIVE', 'OFFLINE', 'DECOMMISSIONED'])
  status?: string;

  @IsOptional()
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
  deviceType?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
