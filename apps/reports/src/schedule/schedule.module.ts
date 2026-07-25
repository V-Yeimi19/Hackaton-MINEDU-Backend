import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleService } from './schedule.service';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [ScheduleModule.forRoot(), ReportModule],
  providers: [ScheduleService],
})
export class ScheduleJobModule {}
