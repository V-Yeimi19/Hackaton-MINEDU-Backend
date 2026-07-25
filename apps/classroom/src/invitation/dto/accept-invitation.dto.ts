import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class AcceptTeacherInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class AcceptFamilyInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsUUID()
  studentId: string;
}
