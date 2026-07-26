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
      include: { courses: true, enrollments: { include: { student: true } } },
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
  async getGrades(@Param('id') id: string) {
    return this.prisma.grade.findMany({
      where: { course: { classroomId: id } },
      include: { course: true },
      orderBy: { date: 'desc' },
    });
  }

  @Get('classrooms')
  getAllClassrooms() {
    return this.prisma.classroom.findMany({
      include: { courses: true, enrollments: { include: { student: true } } },
    });
  }

  @Get('courses')
  getAllCourses() {
    return this.prisma.course.findMany({ include: { classroom: true } });
  }

  @Get('support-needs/student/:studentId')
  getSupportNeeds(@Param('studentId') studentId: string) {
    return this.prisma.studentSupportNeed.findMany({ where: { studentId } });
  }

  @Get('classroom/:id/enrollments')
  getEnrollments(@Param('id') id: string) {
    return this.prisma.enrollment.findMany({
      where: { classroomId: id },
      include: { student: true },
    });
  }

  @Get('students/familiar/:familiarId')
  getStudentsByFamiliar(@Param('familiarId') familiarId: string) {
    return this.prisma.student.findMany({
      where: { familiarId },
    });
  }

  @Get('students')
  getAllStudents() {
    return this.prisma.student.findMany();
  }

  @Get('institutions')
  getAllInstitutions() {
    return this.prisma.institution.findMany({
      include: { classrooms: true, teachers: true },
    });
  }

  @Get('institutions/director/:directorId')
  getInstitutionsByDirector(@Param('directorId') directorId: string) {
    return this.prisma.institution.findMany({
      where: { directorId },
      include: { classrooms: true, teachers: true },
    });
  }

  @Get('competencies/student/:studentId')
  getCompetenciesByStudent(@Param('studentId') studentId: string) {
    return this.prisma.studentCompetency.findMany({
      where: { studentId },
      include: { competency: true },
    });
  }
}
