import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const INCIDENT_SEVERITIES = ['LEVE', 'MODERADO', 'GRAVE'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export class CreateIncidentDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(INCIDENT_SEVERITIES)
  severity?: IncidentSeverity;
}
