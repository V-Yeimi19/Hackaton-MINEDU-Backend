import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportService } from '../report/report.service';

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);

  constructor(private readonly reportService: ReportService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async handleWeeklyReport() {
    this.logger.log('Generando reporte semanal automatico...');

    try {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      const classrooms = await this.reportService.findAllClassrooms();

      for (const classroom of classrooms) {
        try {
          await this.reportService.generateReport({
            classroomId: classroom.id,
            weekStart: weekStart.toISOString(),
            weekEnd: now.toISOString(),
          });
          this.logger.log(`Reporte generado para aula ${classroom.name}`);
        } catch (err) {
          this.logger.error(
            `Error generando reporte para aula ${classroom.id}`,
            err instanceof Error ? err.stack : err,
          );
        }
      }
    } catch (err) {
      this.logger.error('Error en el reporte semanal automatico', err);
    }
  }
}
