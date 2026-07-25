import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateInstitutionReportDto {
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class GenerateClassroomReportDto {
  @IsUUID()
  classroomId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class GenerateStudentReportDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  classroomId: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class ReportFilterDto {
  @IsOptional()
  @IsString()
  gradeLevel?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;
}
