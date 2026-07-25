import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(private prisma: PrismaService) {}

  @Get('classroom/:id')
  getClassroom(@Param('id') id: string) {
    return this.prisma.classroom.findUnique({
      where: { id },
      include: { course: true },
    });
  }

  @Get('classroom/:id/attendances')
  getAttendances(@Param('id') id: string) {
    return this.prisma.attendance.findMany({
      where: { classroomId: id },
      orderBy: { date: 'desc' },
    });
  }

  @Get('classroom/:id/grades')
  getGrades(@Param('id') id: string) {
    return this.prisma.grade.findMany({
      where: { classroomId: id },
      orderBy: { date: 'desc' },
    });
  }

  @Get('classrooms')
  getAllClassrooms() {
    return this.prisma.classroom.findMany({ include: { course: true } });
  }

  @Get('courses')
  getAllCourses() {
    return this.prisma.course.findMany({ include: { classrooms: true } });
  }

  @Get('support-needs/student/:studentId')
  getSupportNeeds(@Param('studentId') studentId: string) {
    return this.prisma.studentSupportNeed.findMany({ where: { studentId } });
  }
}
