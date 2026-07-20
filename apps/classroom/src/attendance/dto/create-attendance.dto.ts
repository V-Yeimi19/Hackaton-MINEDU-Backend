import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export class AttendanceItemDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class CreateAttendanceDto {
  @IsUUID()
  classroomId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceItemDto)
  records: AttendanceItemDto[];
}
