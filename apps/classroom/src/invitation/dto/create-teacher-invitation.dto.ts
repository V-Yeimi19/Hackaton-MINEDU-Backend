import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateTeacherInvitationDto {
  @IsEmail()
  email: string;

  @IsUUID()
  institutionId: string;
}
