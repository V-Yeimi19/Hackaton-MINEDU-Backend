import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsString()
  evaluation?: string;

  @IsOptional()
  @IsNumber()
  score?: number;
}
