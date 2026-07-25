// dto/update-attendance.dto.ts
import { IsEnum } from 'class-validator';
import { AttendanceStatus } from '../../../generated/prisma';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}