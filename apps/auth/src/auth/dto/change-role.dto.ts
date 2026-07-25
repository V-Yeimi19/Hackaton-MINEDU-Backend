import { IsEnum } from 'class-validator';
import { Role } from '@minedu/common';

export class ChangeRoleDto {
  @IsEnum(Role)
  role: Role;
}
