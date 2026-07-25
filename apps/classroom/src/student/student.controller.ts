import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles(Role.FAMILIAR)
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.studentService.create(dto, user.sub);
  }

  @Get()
  @Roles(Role.FAMILIAR)
  findAll(@CurrentUser() user: JwtPayload) {
    return this.studentService.findAllByFamiliar(user.sub);
  }

  @Get(':id')
  @Roles(Role.FAMILIAR, Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentService.findOne(id, user.sub, user.role);
  }

  @Patch(':id')
  @Roles(Role.FAMILIAR)
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: JwtPayload) {
    return this.studentService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.FAMILIAR)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.studentService.remove(id, user.sub, user.role);
  }
}
