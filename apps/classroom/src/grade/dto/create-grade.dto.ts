import { IsNotEmpty, IsString, IsUUID, IsNumber, Min, Max } from 'class-validator';

export class CreateGradeDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  evaluation: string;

  @IsNumber()
  @Min(0)
  @Max(20)
  score: number;
}
