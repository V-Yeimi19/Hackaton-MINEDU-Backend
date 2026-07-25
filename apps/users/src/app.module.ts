import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    UsersModule,
    EventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
