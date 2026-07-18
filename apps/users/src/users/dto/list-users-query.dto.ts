import { PaginationDto, Role } from '@minedu/common';
import { IsEnum, IsOptional } from 'class-validator';

export class ListUsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
