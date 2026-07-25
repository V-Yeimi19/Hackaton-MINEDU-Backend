import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class GenerateReportDto {
  @IsUUID()
  classroomId: string;

  @IsDateString()
  weekStart: string;

  @IsDateString()
  weekEnd: string;
}

export class ReportFilterDto {
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;
}
