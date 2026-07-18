import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  InternalKeyGuard,
  JwtAuthGuard,
  JwtPayload,
  Role,
  Roles,
  RolesGuard,
} from '@minedu/common';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(InternalKeyGuard)
  @Post('internal')
  createProfile(@Body() dto: CreateUserProfileDto) {
    return this.usersService.createProfile(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  @Get()
  findAll(@Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    const user = await this.usersService.findOne(id);
    this.assertSelfOrPrivileged(currentUser, user.authUserId);
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    const user = await this.usersService.findOne(id);
    this.assertSelfOrPrivileged(currentUser, user.authUserId);
    return this.usersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  private assertSelfOrPrivileged(currentUser: JwtPayload, targetAuthUserId: string): void {
    const isSelf = currentUser.sub === targetAuthUserId;
    const isPrivileged = currentUser.role === Role.ADMIN || currentUser.role === Role.DIRECTIVO;
    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }
  }
}
