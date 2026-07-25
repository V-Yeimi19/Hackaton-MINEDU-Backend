import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  gradeLevel?: string;
}
