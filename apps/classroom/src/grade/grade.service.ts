import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
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

  async create(dto: CreateGradeDto) {
    const grade = await this.prisma.grade.create({
      data: {
        studentId: dto.studentId,
        courseId: dto.courseId,
        evaluation: dto.evaluation,
        score: dto.score,
      },
    });
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      await this.pubsub.publish(EVENTS.GRADE_REGISTERED, {
        ...grade,
        classroomId: course?.classroomId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento GRADE_REGISTERED', err);
    }
    return grade;
  }

  async findByClassroom(classroomId: string) {
    return this.prisma.grade.findMany({
      where: { course: { classroomId } },
      include: { course: true },
      orderBy: { date: 'desc' },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId },
      include: { course: true },
      orderBy: { date: 'desc' },
    });
  }

  async update(id: string, dto: UpdateGradeDto) {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('Calificación no encontrada');
    }
    const updated = await this.prisma.grade.update({ where: { id }, data: dto });
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: updated.courseId },
      });
      await this.pubsub.publish(EVENTS.GRADE_UPDATED, {
        ...updated,
        classroomId: course?.classroomId,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento GRADE_UPDATED', err);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const grade = await this.prisma.grade.findUnique({ where: { id } });
    if (!grade) {
      throw new NotFoundException('Calificacion no encontrada');
    }
    await this.prisma.grade.delete({ where: { id } });
  }
}
