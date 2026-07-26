import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AggregationService } from '../aggregation/aggregation.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly aggregationService: AggregationService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailySnapshot() {
    this.logger.log('Generando snapshot diario de métricas del dashboard...');

    try {
      await this.aggregationService.recordDailySnapshots();
      this.logger.log('Snapshot diario generado exitosamente');
    } catch (err) {
      this.logger.error(
        'Error generando snapshot diario del dashboard',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
