import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Role, Roles } from '@minedu/common';
import { GradeService } from './grade.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Controller('grades')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  create(@Body() dto: CreateGradeDto) {
    return this.gradeService.create(dto);
  }

  @Get('classroom/:classroomId')
  findByClassroom(@Param('classroomId') classroomId: string) {
    return this.gradeService.findByClassroom(classroomId);
  }

  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.gradeService.findByStudent(studentId);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGradeDto) {
    return this.gradeService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.gradeService.remove(id);
  }
}
