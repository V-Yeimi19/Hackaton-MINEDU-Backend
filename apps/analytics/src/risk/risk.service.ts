import { Injectable, Logger } from '@nestjs/common';
import { RedisPubSubService, EVENTS } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateRiskLevel } from './risk.rules';
import { RecommendationService } from '../recommendation/recommendation.service';

@Injectable()
export class RiskService {
  private readonly logger = new Logger(RiskService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
    private recommendations: RecommendationService,
  ) {}

  async evaluate(studentId: string, classroomId: string) {
    const indicator = await this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });
    if (!indicator) return;

    const { level, reasons } = calculateRiskLevel(indicator);
    if (level === 'NONE') return;

    const assessment = await this.prisma.riskAssessment.create({
      data: { studentId, classroomId, level, reasons },
    });

    await this.pubsub.publish(EVENTS.RISK_DETECTED, assessment);

    try {
      await this.recommendations.generateFromRisk({
        studentId,
        classroomId,
        level,
        reasons,
      });
    } catch (err) {
      this.logger.error(
        `Fallo generando recomendación para estudiante ${studentId}`,
        err,
      );
    }
  }
}
