import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AggregationModule } from '../aggregation/aggregation.module';
import { ScheduleService } from './schedule.service';

@Module({
  imports: [ScheduleModule.forRoot(), AggregationModule],
  providers: [ScheduleService],
})
export class ScheduleJobModule {}
