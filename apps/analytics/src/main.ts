import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('analytics');

  const port = process.env.PORT ? Number(process.env.PORT) : 3007;
  await app.listen(port);
  logger.log(`Stub service "analytics" listening on port ${port}`);
}

bootstrap();
