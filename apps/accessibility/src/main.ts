import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('accessibility');

  const port = process.env.PORT ? Number(process.env.PORT) : 3009;
  await app.listen(port);
  logger.log(`Stub service "accessibility" listening on port ${port}`);
}

bootstrap();
