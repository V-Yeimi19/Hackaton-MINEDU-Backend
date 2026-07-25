import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateInstitutionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
