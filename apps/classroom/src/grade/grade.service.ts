import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

@Injectable()
export class GradeService {
  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateGradeDto) {
    const grade = await this.prisma.grade.create({
      data: {
        studentId: dto.studentId,
        classroomId: dto.classroomId,
        evaluation: dto.evaluation,
        score: dto.score,
      },
    });
    try {
      await this.pubsub.publish(EVENTS.GRADE_REGISTERED, grade);
    } catch {}
    return grade;
  }

  async findByClassroom(classroomId: string) {
    return this.prisma.grade.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId },
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
      await this.pubsub.publish(EVENTS.GRADE_UPDATED, updated);
    } catch {}
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.grade.delete({ where: { id } });
  }
}
