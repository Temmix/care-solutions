import { IsInt, IsBoolean, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ThresholdDto } from './create-protocol.dto';

export class UpdateProtocolDto {
  @IsOptional()
  @IsInt()
  frequencyHours?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThresholdDto)
  thresholds?: ThresholdDto[];
}
