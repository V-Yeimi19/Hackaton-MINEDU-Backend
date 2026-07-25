import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, Role } from '@minedu/common';
import { buildRecommendation } from './recommendation.rules';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private http: HttpService,
  ) {}

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

  private get classroomUrl() {
    return this.config.get<string>('CLASSROOM_SERVICE_INTERNAL_URL');
  }

  private get internalKey() {
    return this.config.get<string>('INTERNAL_API_KEY');
  }

  private async ensureFamiliarAccess(studentId: string, userId: string) {
    const { data: students } = await firstValueFrom(
      this.http.get<{ id: string }[]>(
        `${this.classroomUrl}/internal/students/familiar/${userId}`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    if (!students.some((s) => s.id === studentId)) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }
  }

  async findByStudent(studentId: string, pagination: PaginationDto, userId?: string, userRole?: Role) {
    if (userRole === Role.FAMILIAR && userId) {
      await this.ensureFamiliarAccess(studentId, userId);
    }
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

  async dismiss(id: string, userId?: string, userRole?: Role) {
    const existing = await this.prisma.recommendation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Recomendación no encontrada');

    if (userRole === Role.DOCENTE && userId) {
      const { data: classroom } = await firstValueFrom(
        this.http.get<{ teacherId: string }>(
          `${this.classroomUrl}/internal/classroom/${existing.classroomId}`,
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      if (classroom.teacherId !== userId) {
        throw new ForbiddenException('No tienes acceso a esta recomendación');
      }
    }

    return this.prisma.recommendation.update({
      where: { id },
      data: { status: 'DISMISSED' },
    });
  }
}
