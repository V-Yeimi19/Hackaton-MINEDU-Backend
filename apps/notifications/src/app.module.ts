import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { EventsModule } from './events/events.module';
import { HealthController } from './health/health.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = new URL(configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
          },
        };
      },
    }),
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    NotificationsModule,
    EventsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
