import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class AcceptTeacherInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;
}

export class AcceptFamilyInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsUUID()
  studentId: string;
}
