import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { CourseModule } from './course/course.module';
import { ClassroomModule } from './classroom/classroom.module';
import { AttendanceModule } from './attendance/attendance.module';
import { GradeModule } from './grade/grade.module';
import { CompetencyModule } from './competency/competency.module';
import { SupportNeedModule } from './support-need/support-need.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    CourseModule,
    ClassroomModule,
    AttendanceModule,
    GradeModule,
    CompetencyModule,
    SupportNeedModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
