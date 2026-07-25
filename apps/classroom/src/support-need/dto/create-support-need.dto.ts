import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export enum SupportNeedType {
  DISCAPACIDAD_VISUAL = 'DISCAPACIDAD_VISUAL',
  DISCAPACIDAD_AUDITIVA = 'DISCAPACIDAD_AUDITIVA',
  DISCAPACIDAD_INTELECTUAL = 'DISCAPACIDAD_INTELECTUAL',
  DISCAPACIDAD_MOTORA = 'DISCAPACIDAD_MOTORA',
  TRASTORNO_ESPECTRO_AUTISTA = 'TRASTORNO_ESPECTRO_AUTISTA',
  DIFICULTAD_APRENDIZAJE = 'DIFICULTAD_APRENDIZAJE',
  TDAH = 'TDAH',
  MULTIDISCAPACIDAD = 'MULTIDISCAPACIDAD',
  OTRO = 'OTRO',
}

export enum SupportLevel {
  LEVE = 'LEVE',
  MODERADO = 'MODERADO',
  SIGNIFICATIVO = 'SIGNIFICATIVO',
}

export class CreateSupportNeedDto {
  @IsUUID()
  studentId: string;

  @IsEnum(SupportNeedType)
  type: SupportNeedType;

  @IsOptional()
  @IsEnum(SupportLevel)
  level?: SupportLevel = SupportLevel.MODERADO;

  @IsOptional()
  @IsString()
  description?: string;
}
