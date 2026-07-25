import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  classroomId: string;
}
