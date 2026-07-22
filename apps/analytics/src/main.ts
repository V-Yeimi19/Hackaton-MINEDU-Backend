import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { HttpExceptionFilter } from '@minedu/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Analytics');

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = configService.get<number>('ANALYTICS_PORT') ?? 3007;
  await app.listen(port);
  logger.log(`Analytics service listening on port ${port}`);
}

bootstrap();
