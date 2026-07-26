import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AggregationModule } from './aggregation/aggregation.module';
import { ProgressModule } from './progress/progress.module';
import { StudentExtrasModule } from './student-extras/student-extras.module';
import { ScheduleJobModule } from './schedule/schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    AggregationModule,
    ProgressModule,
    StudentExtrasModule,
    ScheduleJobModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
