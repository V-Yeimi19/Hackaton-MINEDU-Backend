import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { ClassroomService } from './classroom.services';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { EnrollClassroomDto } from './dto/enroll-classroom.dto';

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomController {
  constructor(private readonly classroomService: ClassroomService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  create(@Body() dto: CreateClassroomDto, @CurrentUser() user: JwtPayload) {
    return this.classroomService.create(dto, user.sub);
  }

  @Get()
  findAll() {
    return this.classroomService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classroomService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  update(@Param('id') id: string, @Body() dto: UpdateClassroomDto) {
    return this.classroomService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  remove(@Param('id') id: string) {
    return this.classroomService.remove(id);
  }

  @Post('enroll')
  @Roles(Role.ESTUDIANTE)
  enroll(@Body() dto: EnrollClassroomDto, @CurrentUser() user: JwtPayload) {
    return this.classroomService.enroll(dto, user.sub);
  }

  @Post('unenroll')
  @Roles(Role.ESTUDIANTE)
  unenroll(@Body() dto: EnrollClassroomDto, @CurrentUser() user: JwtPayload) {
    return this.classroomService.unenroll(dto, user.sub);
  }
}