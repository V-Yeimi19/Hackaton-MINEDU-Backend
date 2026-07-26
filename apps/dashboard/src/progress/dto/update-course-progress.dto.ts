import { IsInt, Min } from 'class-validator';

export class UpdateCourseProgressDto {
  @IsInt()
  @Min(0)
  totalUnits: number;

  @IsInt()
  @Min(0)
  completedUnits: number;
}
