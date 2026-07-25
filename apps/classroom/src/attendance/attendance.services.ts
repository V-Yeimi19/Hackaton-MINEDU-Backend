import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateAttendanceDto, teacherId: string, userRole: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
    });
    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }
    if (userRole === Role.DOCENTE && classroom.teacherId !== teacherId) {
      throw new ForbiddenException('No tienes permiso para registrar asistencia en esta aula');
    }

    const studentIds = dto.records.map((r) => r.studentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classroomId: dto.classroomId,
        studentId: { in: studentIds },
      },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.studentId));
    const notEnrolled = studentIds.filter((id) => !enrolledIds.has(id));
    if (notEnrolled.length > 0) {
      throw new BadRequestException(
        `Estudiantes no matriculados en esta aula: ${notEnrolled.join(', ')}`,
      );
    }

    const attendances = await Promise.all(
      dto.records.map((record) =>
        this.prisma.attendance.create({
          data: {
            classroomId: dto.classroomId,
            studentId: record.studentId,
            date: new Date(dto.date),
            status: record.status,
          },
        }),
      ),
    );

    try {
      await this.pubsub.publish(EVENTS.ATTENDANCE_BATCH_REGISTERED, {
        classroomId: dto.classroomId,
        date: dto.date,
        count: attendances.length,
        teacherId,
      });

      await Promise.all(
        attendances.map((attendance) =>
          this.pubsub.publish(EVENTS.ATTENDANCE_REGISTERED, {
            studentId: attendance.studentId,
            classroomId: attendance.classroomId,
            status: attendance.status,
            date: attendance.date,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `No se pudo publicar evento(s) de asistencia para aula ${dto.classroomId}`,
        err instanceof Error ? err.stack : err,
      );
    }

    return attendances;
  }

  async update(id: string, dto: UpdateAttendanceDto, userId: string, userRole: string) {
    const previous = await this.prisma.attendance.findUnique({ where: { id } });
    if (!previous) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }
    if (userRole === Role.DOCENTE) {
      const classroom = await this.prisma.classroom.findUnique({ where: { id: previous.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para editar esta asistencia');
      }
    }

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: { status: dto.status },
    });

    try {
      await this.pubsub.publish(EVENTS.ATTENDANCE_UPDATED, {
        studentId: updated.studentId,
        classroomId: updated.classroomId,
        status: updated.status,
        previousStatus: previous.status,
        date: updated.date,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo publicar evento de actualización de asistencia (id: ${id})`,
        err instanceof Error ? err.stack : err,
      );
    }

    return updated;
  }

  async findByClassroom(classroomId: string, userId?: string, userRole?: string) {
    const where: any = { classroomId };
    if (userRole === Role.FAMILIAR && userId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { classroomId, familiarId: userId },
        select: { studentId: true },
      });
      const studentIds = enrollments.map((e) => e.studentId);
      if (studentIds.length === 0) return [];
      where.studentId = { in: studentIds };
    }
    return this.prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findByStudent(studentId: string, userId?: string, userRole?: string) {
    if (userRole === Role.FAMILIAR && userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, familiarId: userId },
      });
      if (!enrollment) {
        throw new ForbiddenException('No tienes acceso a la asistencia de este estudiante');
      }
    }
    return this.prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
  }
}
