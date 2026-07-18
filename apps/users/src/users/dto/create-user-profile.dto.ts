import { Role } from '@minedu/common';
import { IsEmail, IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateUserProfileDto {
  @IsUUID()
  authUserId: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  fullName: string;

  @IsEnum(Role)
  role: Role;
}
