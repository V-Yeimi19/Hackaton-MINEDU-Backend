import { Role } from '@minedu/common';
import { IsEnum, IsNotEmpty, IsEmail, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  fullName: string;

  @IsEnum(Role)
  role: Role;
}
