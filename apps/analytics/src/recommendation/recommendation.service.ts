import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '@minedu/common';
import { buildRecommendation } from './recommendation.rules';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(private prisma: PrismaService) {}

  async generateFromRisk(assessment: {
    studentId: string;
    classroomId: string;
    level: string;
    reasons: string[];
  }) {
    const { type, message } = buildRecommendation(assessment.reasons);

    const recommendation = await this.prisma.recommendation.create({
      data: {
        studentId: assessment.studentId,
        classroomId: assessment.classroomId,
        type,
        message,
        source: 'rules',
      },
    });

    this.logger.log(
      `Recomendación ${recommendation.id} generada para estudiante ${assessment.studentId} (riesgo ${assessment.level})`,
    );

    return recommendation;
  }

  async findByClassroom(classroomId: string, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { classroomId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recommendation.count({ where: { classroomId } }),
    ]);

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findByStudent(studentId: string, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.recommendation.findMany({
        where: { studentId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recommendation.count({ where: { studentId } }),
    ]);

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async dismiss(id: string) {
    return this.prisma.recommendation.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
  }
}
