import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisPubSubService, EVENTS } from '@minedu/common';
import { IndicatorsService } from '../indicators/indicators.service';
import { RiskService } from '../risk/risk.service';

interface CompetencyPayload {
  studentId: string;
  classroomId: string;
  level: string;
  competencyName: string;
}

@Injectable()
export class CompetencyEventsListener implements OnModuleInit {
  private readonly logger = new Logger(CompetencyEventsListener.name);

  constructor(
    private readonly pubsub: RedisPubSubService,
    private readonly indicators: IndicatorsService,
    private readonly risk: RiskService,
  ) {}

  onModuleInit() {
    this.pubsub.subscribe<CompetencyPayload>(EVENTS.COMPETENCY_EVALUATED, (payload) =>
      this.handle(payload),
    );
  }

  private async handle(payload: CompetencyPayload) {
    try {
      await this.indicators.recalculateCompetency({
        studentId: payload.studentId,
        classroomId: payload.classroomId,
        level: payload.level,
      });
      await this.risk.evaluate(payload.studentId, payload.classroomId);
    } catch (err) {
      this.logger.error(
        `Fallo procesando evento de competencia para estudiante ${payload.studentId}`,
        err,
      );
    }
  }
}
