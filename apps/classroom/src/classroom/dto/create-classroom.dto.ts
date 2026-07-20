import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  courseId: string;
}
