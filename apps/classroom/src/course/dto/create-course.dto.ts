import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gradeLevel: string;

  @IsString()
  @IsNotEmpty()
  teacherId: string;
}
