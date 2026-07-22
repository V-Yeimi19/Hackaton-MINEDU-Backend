import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { IndicatorsModule } from './indicators/indicators.module';
import { DigitalTwinModule } from './digital-twin/digital-twin.module';
import { RiskModule } from './risk/risk.module';
import { RecommendationModule } from './recommendation/recommendation.module';
import { EventListenersModule } from './event-listeners/event-listeners.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    RedisPubSubModule,
    AuthModule,
    IndicatorsModule,
    DigitalTwinModule,
    RiskModule,
    RecommendationModule,
    EventListenersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
