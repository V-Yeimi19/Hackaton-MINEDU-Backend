import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportService } from '../report/report.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly reportService: ReportService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyReport() {
    this.logger.log('Generando reporte institucional semanal automatico...');

    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      await this.reportService.generateReport(
        {
          periodStart: weekStart.toISOString(),
          periodEnd: now.toISOString(),
        },
        'system',
      );

      this.logger.log('Reporte institucional semanal generado exitosamente');
    } catch (err) {
      this.logger.error(
        'Error generando reporte institucional semanal',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
