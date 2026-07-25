import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
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

  async evaluate(dto: EvaluateCompetencyDto) {
    await this.findOne(dto.competencyId);
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

  async findByStudent(studentId: string) {
    return this.prisma.studentCompetency.findMany({
      where: { studentId },
      include: { competency: true, course: true },
      orderBy: { date: 'desc' },
    });
  }
}
