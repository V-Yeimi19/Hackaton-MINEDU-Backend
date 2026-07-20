import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';

@Injectable()
export class AttendanceService {
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
      await this.pubsub.publish(EVENTS.ATTENDANCE_REGISTERED, {
        classroomId: dto.classroomId,
        date: dto.date,
        count: attendances.length,
        teacherId,
      });
    } catch {}

    return attendances;
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