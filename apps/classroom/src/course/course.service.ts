import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
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

  async create(dto: CreateCourseDto, userId: string, userRole: string) {
    if (userRole === Role.DOCENTE) {
      const classroom = await this.prisma.classroom.findUnique({ where: { id: dto.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para crear cursos en este aula');
      }
    }
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

  async findAll(userId?: string, userRole?: string) {
    if (userRole === Role.FAMILIAR && userId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { familiarId: userId },
        select: { classroomId: true },
      });
      if (enrollments.length === 0) return [];
      const classroomIds = enrollments.map((e) => e.classroomId);
      return this.prisma.course.findMany({
        where: { classroomId: { in: classroomIds } },
        include: { classroom: true },
      });
    }
    return this.prisma.course.findMany({ include: { classroom: true } });
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: { classroom: true },
    });
    if (!course) {
      throw new NotFoundException('Curso no encontrado');
    }
    if (userRole === Role.FAMILIAR && userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { classroomId: course.classroomId, familiarId: userId },
      });
      if (!enrollment) {
        throw new ForbiddenException('No tienes acceso a este curso');
      }
    }
    return course;
  }

  async update(id: string, dto: UpdateCourseDto, userId: string, userRole: string) {
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para editar este curso');
      }
    }
    await this.findOne(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para eliminar este curso');
      }
    }
    await this.findOne(id);
    await this.prisma.course.delete({ where: { id } });
  }
}
