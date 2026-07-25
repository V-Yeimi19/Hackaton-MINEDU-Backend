import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateClassroomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  gradeLevel: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string;
}
