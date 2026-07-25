import { IsEnum, IsUUID } from 'class-validator';

export enum CompetencyLevel {
  BASICO = 'BASICO',
  INTERMEDIO = 'INTERMEDIO',
  AVANZADO = 'AVANZADO',
  LOGRADO = 'LOGRADO',
}

export class EvaluateCompetencyDto {
  @IsUUID()
  competencyId: string;

  @IsUUID()
  studentId: string;

  @IsUUID()
  courseId: string;

  @IsEnum(CompetencyLevel)
  level: CompetencyLevel;
}
