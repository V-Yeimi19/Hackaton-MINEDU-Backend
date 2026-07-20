import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gradeLevel?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  teacherId?: string;
}
