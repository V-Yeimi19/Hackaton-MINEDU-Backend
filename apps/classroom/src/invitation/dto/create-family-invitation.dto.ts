import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateFamilyInvitationDto {
  @IsEmail()
  email: string;

  @IsUUID()
  classroomId: string;
}
