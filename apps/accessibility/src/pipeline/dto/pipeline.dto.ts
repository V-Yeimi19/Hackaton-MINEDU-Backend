import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export enum AdaptationLevel {
  LEVE = 'LEVE',
  MODERADO = 'MODERADO',
  SIGNIFICATIVO = 'SIGNIFICATIVO',
}

export class ProcessContentDto {
  @IsUUID()
  @IsNotEmpty()
  fileId: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsEnum(AdaptationLevel)
  adaptationLevel: AdaptationLevel = AdaptationLevel.MODERADO;
}

export class GenerateWorksheetDto extends ProcessContentDto {
  @IsOptional()
  @IsUUID()
  studentId?: string;
}
