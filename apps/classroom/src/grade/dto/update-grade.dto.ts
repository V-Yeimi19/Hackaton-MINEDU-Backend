import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateGradeDto {
  @IsOptional()
  @IsString()
  evaluation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  score?: number;
}
