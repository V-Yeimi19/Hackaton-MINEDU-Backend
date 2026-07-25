import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisPubSubModule } from '@minedu/common';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import { MinioModule } from './minio/minio.module';
import { PrismaModule } from './prisma/prisma.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    RedisPubSubModule,
    MinioModule,
    AuthModule,
    FilesModule,
    InternalModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
