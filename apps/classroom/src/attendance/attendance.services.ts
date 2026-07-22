import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
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

  async create(dto: CreateAttendanceDto, teacherId: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
    });
    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
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

  async update(id: string, dto: UpdateAttendanceDto) {
    const previous = await this.prisma.attendance.findUnique({ where: { id } });
    if (!previous) {
      throw new NotFoundException('Registro de asistencia no encontrado');
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

  async findByClassroom(classroomId: string) {
    return this.prisma.attendance.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: 'desc' },
    });
  }
}