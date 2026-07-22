// dto/update-attendance.dto.ts
import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma/client';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}