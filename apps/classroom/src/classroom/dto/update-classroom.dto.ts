import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;
}
