import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateInstitutionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
