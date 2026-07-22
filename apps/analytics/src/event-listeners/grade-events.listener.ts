import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisPubSubService, EVENTS } from '@minedu/common';
import { IndicatorsService } from '../indicators/indicators.service';
import { RiskService } from '../risk/risk.service';

interface GradePayload {
  studentId: string;
  classroomId: string;
  score: number;
}

@Injectable()
export class GradeEventsListener implements OnModuleInit {
  private readonly logger = new Logger(GradeEventsListener.name);

  constructor(
    private readonly pubsub: RedisPubSubService,
    private readonly indicators: IndicatorsService,
    private readonly risk: RiskService,
  ) {}

  onModuleInit() {
    this.pubsub.subscribe<GradePayload>(EVENTS.GRADE_REGISTERED, (payload) =>
      this.handleGradeRegistered(payload),
    );
    this.pubsub.subscribe<GradePayload>(EVENTS.GRADE_UPDATED, (payload) =>
      this.handleGradeUpdated(payload),
    );
  }

  private async handleGradeRegistered(payload: GradePayload) {
    try {
      await this.indicators.recalculateGrade({
        studentId: payload.studentId,
        classroomId: payload.classroomId,
        score: payload.score,
      });
      await this.risk.evaluate(payload.studentId, payload.classroomId);
    } catch (err) {
      this.logger.error(
        `Fallo procesando evento de calificación registrado para estudiante ${payload.studentId}`,
        err,
      );
    }
  }

  private async handleGradeUpdated(payload: GradePayload) {
    try {
      await this.indicators.recalculateAllGrades(payload.studentId, payload.classroomId);
      await this.risk.evaluate(payload.studentId, payload.classroomId);
    } catch (err) {
      this.logger.error(
        `Fallo procesando evento de calificación actualizado para estudiante ${payload.studentId}`,
        err,
      );
    }
  }
}
