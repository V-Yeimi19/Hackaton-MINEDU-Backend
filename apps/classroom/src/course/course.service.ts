import { Injectable, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateCourseDto) {
    const course = await this.prisma.course.create({ data: dto });
    try {
      await this.pubsub.publish(EVENTS.COURSE_CREATED, course);
    } catch {}
    return course;
  }

  async findAll() {
    return this.prisma.course.findMany({ include: { classrooms: true } });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { classrooms: true },
    });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }
    return course;
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.course.delete({ where: { id } });
  }
}
