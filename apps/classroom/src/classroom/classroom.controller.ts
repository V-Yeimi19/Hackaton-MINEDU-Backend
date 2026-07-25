import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { ClassroomService } from './classroom.services';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  create(@Body() dto: CreateClassroomDto, @CurrentUser() user: JwtPayload) {
    return this.classroomService.create(dto, user.sub, user.role);
  }

  @Get()
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.classroomService.findAll(user.role, user.sub);
  }

  @Get(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findOne(@Param('id') id: string) {
    return this.classroomService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classroomService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classroomService.remove(id, user.sub, user.role);
  }

  @Get(':id/enrollments')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  getEnrollments(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.classroomService.getEnrollments(id, user.sub, user.role);
  }

  @Delete(':id/enrollments/:enrollmentId')
  @Roles(Role.DOCENTE, Role.ADMIN)
  removeEnrollment(
    @Param('id') id: string,
    @Param('enrollmentId') enrollmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.classroomService.removeEnrollment(id, enrollmentId, user.sub, user.role);
  }
}
