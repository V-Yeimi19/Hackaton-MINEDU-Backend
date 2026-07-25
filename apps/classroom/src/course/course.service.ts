import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateCourseDto) {
    const course = await this.prisma.course.create({
      data: { name: dto.name, classroomId: dto.classroomId },
      include: { classroom: true },
    });
    try {
      await this.pubsub.publish(EVENTS.COURSE_CREATED, course);
    } catch (err) {
      this.logger.warn('Fallo publicando evento COURSE_CREATED', err);
    }
    return course;
  }

  async findAll() {
    return this.prisma.course.findMany({ include: { classroom: true } });
  }

  async findOne(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { classroom: true },
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
