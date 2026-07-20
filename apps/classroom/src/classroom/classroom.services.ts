import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';
import { EnrollClassroomDto } from './dto/enroll-classroom.dto';

@Injectable()
export class ClassroomService {
  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateClassroomDto, teacherId: string) {
    const classroom = await this.prisma.classroom.create({ data: dto });
    try {
      await this.pubsub.publish(EVENTS.CLASSROOM_CREATED, classroom);
    } catch {}
    return classroom;
  }

  async findAll() {
    return this.prisma.classroom.findMany({ include: { course: true } });
  }

  async findOne(id: string) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!classroom) {
      throw new NotFoundException('Aula no encontrada');
    }
    return classroom;
  }

  async update(id: string, dto: UpdateClassroomDto) {
    await this.findOne(id);
    const classroom = await this.prisma.classroom.update({
      where: { id },
      data: dto,
    });
    try {
      await this.pubsub.publish(EVENTS.CLASSROOM_UPDATED, classroom);
    } catch {}
    return classroom;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.classroom.delete({ where: { id } });
  }

  async enroll(dto: EnrollClassroomDto, studentId: string) {
    const classroom = await this.findOne(dto.classroomId);
    const newStudentIds = [...new Set([...classroom.studentIds, studentId])];
    const updated = await this.prisma.classroom.update({
      where: { id: dto.classroomId },
      data: { studentIds: newStudentIds },
    });
    try {
      await this.pubsub.publish(EVENTS.STUDENT_ENROLLED, {
        classroomId: dto.classroomId,
        studentId,
      });
    } catch {}
    return updated;
  }

  async unenroll(dto: EnrollClassroomDto, studentId: string) {
    const classroom = await this.findOne(dto.classroomId);
    const newStudentIds = classroom.studentIds.filter((id) => id !== studentId);
    const updated = await this.prisma.classroom.update({
      where: { id: dto.classroomId },
      data: { studentIds: newStudentIds },
    });
    try {
      await this.pubsub.publish(EVENTS.STUDENT_UNENROLLED, {
        classroomId: dto.classroomId,
        studentId,
      });
    } catch {}
    return updated;
  }
}