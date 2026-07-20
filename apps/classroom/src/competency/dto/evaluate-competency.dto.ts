import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export enum CompetencyLevel {
  BASICO = 'BASICO',
  INTERMEDIO = 'INTERMEDIO',
  AVANZADO = 'AVANZADO',
  LOGRADO = 'LOGRADO',
}

export class EvaluateCompetencyDto {
  @IsUUID()
  competencyId: string;

  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(CompetencyLevel)
  level: CompetencyLevel;
}
