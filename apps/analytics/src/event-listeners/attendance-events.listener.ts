import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { RedisPubSubService, EVENTS } from '@minedu/common';
import { IndicatorsService } from '../indicators/indicators.service';
import { RiskService } from '../risk/risk.service';

interface AttendancePayload {
  studentId: string;
  classroomId: string;
  status: string;
  previousStatus?: string | null;
}

@Injectable()
export class AttendanceEventsListener implements OnModuleInit {
  private readonly logger = new Logger(AttendanceEventsListener.name);

  constructor(
    private readonly pubsub: RedisPubSubService,
    private readonly indicators: IndicatorsService,
    private readonly risk: RiskService,
  ) {}

  onModuleInit() {
    this.pubsub.subscribe<AttendancePayload>(EVENTS.ATTENDANCE_REGISTERED, (payload) =>
      this.handle(payload, null),
    );
    this.pubsub.subscribe<AttendancePayload>(EVENTS.ATTENDANCE_UPDATED, (payload) =>
      this.handle(payload, payload.previousStatus ?? null),
    );
  }

  private async handle(payload: AttendancePayload, previousStatus: string | null) {
    try {
      await this.indicators.recalculateAttendance({
        studentId: payload.studentId,
        classroomId: payload.classroomId,
        status: payload.status,
        previousStatus,
      });
      await this.risk.evaluate(payload.studentId, payload.classroomId);
    } catch (err) {
      this.logger.error(
        `Fallo procesando evento de asistencia para estudiante ${payload.studentId}`,
        err,
      );
    }
  }
}
