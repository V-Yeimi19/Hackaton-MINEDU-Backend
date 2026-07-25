import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { SupportNeedType, SupportLevel } from '../../support-need/dto/create-support-need.dto';

export class SupportNeedInputDto {
  @IsEnum(SupportNeedType)
  type: SupportNeedType;

  @IsOptional()
  @IsEnum(SupportLevel)
  level?: SupportLevel;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  birthDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupportNeedInputDto)
  supportNeeds?: SupportNeedInputDto[];
}
