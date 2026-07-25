import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { EvaluateCompetencyDto } from './dto/evaluate-competency.dto';

@Injectable()
export class CompetencyService {
  private readonly logger = new Logger(CompetencyService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateCompetencyDto) {
    return this.prisma.competency.create({ data: dto });
  }

  async findAll() {
    return this.prisma.competency.findMany();
  }

  async findOne(id: string) {
    const competency = await this.prisma.competency.findUnique({
      where: { id },
    });
    if (!competency) {
      throw new NotFoundException('Competencia no encontrada');
    }
    return competency;
  }

  async evaluate(dto: EvaluateCompetencyDto, userId: string, userRole: string) {
    await this.findOne(dto.competencyId);
    if (userRole === Role.DOCENTE) {
      const course = await this.prisma.course.findUnique({ where: { id: dto.courseId } });
      if (!course) throw new NotFoundException('Curso no encontrado');
      const classroom = await this.prisma.classroom.findUnique({ where: { id: course.classroomId } });
      if (!classroom || classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes permiso para evaluar competencias en este curso');
      }
    }
    const evaluation = await this.prisma.studentCompetency.create({
      data: {
        competencyId: dto.competencyId,
        studentId: dto.studentId,
        courseId: dto.courseId,
        level: dto.level,
      },
    });
    try {
      const course = await this.prisma.course.findUnique({
        where: { id: dto.courseId },
      });
      const competency = await this.prisma.competency.findUnique({
        where: { id: dto.competencyId },
      });
      await this.pubsub.publish(EVENTS.COMPETENCY_EVALUATED, {
        ...evaluation,
        classroomId: course?.classroomId,
        competencyName: competency?.name,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento COMPETENCY_EVALUATED', err);
    }
    return evaluation;
  }

  async findByStudent(studentId: string, userId?: string, userRole?: string) {
    if (userRole === Role.FAMILIAR && userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, familiarId: userId },
      });
      if (!enrollment) {
        throw new ForbiddenException('No tienes acceso a este estudiante');
      }
    }
    return this.prisma.studentCompetency.findMany({
      where: { studentId },
      include: { competency: true, course: true },
      orderBy: { date: 'desc' },
    });
  }
}
