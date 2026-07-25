import { Controller, Get, Post, Param, Body, Query, UseGuards, Patch } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { AttendanceService } from './attendance.services';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  create(@Body() dto: CreateAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.attendanceService.create(dto, user.sub, user.role);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto, @CurrentUser() user: JwtPayload) {
    return this.attendanceService.update(id, dto, user.sub, user.role);
  }

  @Get('classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByClassroom(@Param('classroomId') classroomId: string, @CurrentUser() user: JwtPayload) {
    return this.attendanceService.findByClassroom(classroomId, user.sub, user.role);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudent(@Param('studentId') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.attendanceService.findByStudent(studentId, user.sub, user.role);
  }
}