import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SupportLevel, SupportNeedType } from './create-support-need.dto';

export class UpdateSupportNeedDto {
  @IsOptional()
  @IsEnum(SupportNeedType)
  type?: SupportNeedType;

  @IsOptional()
  @IsEnum(SupportLevel)
  level?: SupportLevel;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}
