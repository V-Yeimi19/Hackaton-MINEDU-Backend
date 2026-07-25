import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateClassroomDto, teacherId: string) {
    const classroom = await this.prisma.classroom.create({
      data: {
        name: dto.name,
        gradeLevel: dto.gradeLevel,
        institutionId: dto.institutionId ?? null,
        teacherId,
      },
    });
    try {
      await this.pubsub.publish(EVENTS.CLASSROOM_CREATED, {
        ...classroom,
        teacherId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento CLASSROOM_CREATED', err);
    }
    return classroom;
  }

  async findAll(userRole?: string, userId?: string) {
    const include = { courses: true, enrollments: { include: { student: true } } };

    if (userRole === Role.FAMILIAR && userId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { familiarId: userId },
        select: { classroomId: true },
      });
      const classroomIds = [...new Set(enrollments.map((e) => e.classroomId))];
      return this.prisma.classroom.findMany({
        where: { id: { in: classroomIds } },
        include,
      });
    }

    if (userRole === Role.DOCENTE && userId) {
      return this.prisma.classroom.findMany({
        where: { teacherId: userId },
        include,
      });
    }

    if (userRole === Role.DIRECTIVO && userId) {
      const institutions = await this.prisma.institution.findMany({
        where: { directorId: userId },
        select: { id: true },
      });
      const institutionIds = institutions.map((i) => i.id);
      return this.prisma.classroom.findMany({
        where: { institutionId: { in: institutionIds } },
        include,
      });
    }

    return this.prisma.classroom.findMany({ include });
  }

  async findOne(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: { courses: true },
    });
    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }
    return classroom;
  }

  async update(id: string, dto: UpdateClassroomDto, userId: string, userRole: string) {
    const classroom = await this.findOne(id);
    if (userRole !== Role.ADMIN && classroom.teacherId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar esta aula');
    }
    const updated = await this.prisma.classroom.update({
      where: { id },
      data: dto,
    });
    try {
      await this.pubsub.publish(EVENTS.CLASSROOM_UPDATED, updated);
    } catch (err) {
      this.logger.warn('Fallo publicando evento CLASSROOM_UPDATED', err);
    }
    return updated;
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const classroom = await this.findOne(id);
    if (userRole !== Role.ADMIN && classroom.teacherId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta aula');
    }
    await this.prisma.classroom.delete({ where: { id } });
  }

  async getEnrollments(classroomId: string) {
    await this.findOne(classroomId);
    return this.prisma.enrollment.findMany({
      where: { classroomId },
      include: { student: true },
    });
  }

  async removeEnrollment(classroomId: string, enrollmentId: string) {
    await this.findOne(classroomId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });
    if (!enrollment || enrollment.classroomId !== classroomId) {
      throw new NotFoundException('Matrícula no encontrada en esta aula');
    }
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    try {
      await this.pubsub.publish(EVENTS.STUDENT_UNENROLLED, {
        classroomId,
        studentId: enrollment.studentId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento STUDENT_UNENROLLED', err);
    }
  }
}
