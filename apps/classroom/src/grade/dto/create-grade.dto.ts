import { IsEnum, IsNotEmpty, IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsUUID()
  classroomId: string;

  @IsString()
  @IsNotEmpty()
  evaluation: string;

  @IsNumber()
  score: number;
}
