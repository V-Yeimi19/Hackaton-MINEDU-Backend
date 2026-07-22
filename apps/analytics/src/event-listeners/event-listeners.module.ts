import { Module } from '@nestjs/common';
import { AttendanceEventsListener } from './attendance-events.listener';
import { GradeEventsListener } from './grade-events.listener';
import { IndicatorsModule } from '../indicators/indicators.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [IndicatorsModule, RiskModule],
  providers: [AttendanceEventsListener, GradeEventsListener],
})
export class EventListenersModule {}
