import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradeService {
  private readonly logger = new Logger(GradeService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateGradeDto, userId: string, userRole: string) {
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para calificar en este curso');
      }
    }
    const grade = await this.prisma.grade.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        evaluation: dto.evaluation,
        score: dto.score,
      },
      include: { course: true },
    });
    try {
      await this.pubsub.publish(EVENTS.GRADE_REGISTERED, {
        ...grade,
        classroomId: grade.course.classroomId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento GRADE_REGISTERED', err);
    }
    return grade;
  }

  async findByClassroom(classroomId: string, userId?: string, userRole?: string) {
    const where: any = { course: { classroomId } };
    if (userRole === Role.FAMILIAR && userId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { classroomId, familiarId: userId },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);
      if (studentIds.length === 0) return [];
      where.studentId = { in: studentIds };
    }
    return this.prisma.grade.findMany({
      where,
      include: { course: true },
      orderBy: { date: 'desc' },
    });
  }

  async findByStudent(studentId: string, userId?: string, userRole?: string) {
    if (userRole === Role.FAMILIAR && userId) {
      // Ownership real es Student.familiarId, no si ya tiene una matrícula —
      // un estudiante recién registrado y aún sin aula debe poder verse (vacío),
      // no recibir 403.
      const student = await this.prisma.student.findUnique({ where: { id: studentId } });
      if (!student || student.familiarId !== userId) {
        throw new ForbiddenException('No tienes acceso a las calificaciones de este estudiante');
      }
    }
    return this.prisma.grade.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, dto: UpdateGradeDto, userId: string, userRole: string) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id: grade.courseId } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para editar esta calificación');
      }
    }
    const updated = await this.prisma.grade.update({
      where: { id },
      data: dto,
      include: { course: true },
    });
    try {
      await this.pubsub.publish(EVENTS.GRADE_UPDATED, {
        ...updated,
        classroomId: updated.course.classroomId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento GRADE_UPDATED', err);
    }
    return updated;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('Calificacion no encontrada');
    }
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id: grade.courseId } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para eliminar esta calificación');
      }
    }
    await this.prisma.grade.delete({ where: { id } });
  }
}
