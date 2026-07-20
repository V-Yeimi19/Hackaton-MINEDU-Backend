import { IsUUID } from 'class-validator';

export class EnrollClassroomDto {
  @IsUUID()
  classroomId: string;
}
