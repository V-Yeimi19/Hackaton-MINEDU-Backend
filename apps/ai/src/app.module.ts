import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { RedisPubSubModule } from '@minedu/common';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { ReportModule } from './report/report.module';
import { ScheduleJobModule } from './schedule/schedule.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    HttpModule,
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    ReportModule,
    ScheduleJobModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
