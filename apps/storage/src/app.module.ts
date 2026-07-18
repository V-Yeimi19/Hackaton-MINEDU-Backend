import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import { MinioModule } from './minio/minio.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envValidationSchema }),
    PrismaModule,
    MinioModule,
    AuthModule,
    FilesModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
