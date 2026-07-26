import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export const TREND_METRICS = ['avgAttendanceRate', 'avgGrade', 'totalStudents', 'activeInstitutions'] as const;
export type TrendMetric = (typeof TREND_METRICS)[number];

export class TrendsQueryDto {
  @IsIn(['NATIONAL', 'INSTITUTION'])
  scope: 'NATIONAL' | 'INSTITUTION';

  @ValidateIf((dto) => dto.scope === 'INSTITUTION')
  @IsString()
  scopeId?: string;

  @IsIn(TREND_METRICS)
  metric: TrendMetric;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number;
}
