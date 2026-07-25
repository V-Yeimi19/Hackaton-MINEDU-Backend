import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Role, Roles, CurrentUser } from '@minedu/common';
import { GradeService } from './grade.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  create(@Body() dto: CreateGradeDto, @CurrentUser() user: JwtPayload) {
    return this.gradeService.create(dto, user.sub, user.role);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByClassroom(@Param('classroomId') classroomId: string) {
    return this.gradeService.findByClassroom(classroomId);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudent(@Param('studentId') studentId: string) {
    return this.gradeService.findByStudent(studentId);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  update(@Param('id') id: string, @Body() dto: UpdateGradeDto, @CurrentUser() user: JwtPayload) {
    return this.gradeService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.gradeService.remove(id, user.sub, user.role);
  }
}
