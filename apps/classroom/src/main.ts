import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('classroom');

  const port = process.env.PORT ? Number(process.env.PORT) : 3006;
  await app.listen(port);
  logger.log(`Stub service "classroom" listening on port ${port}`);
}

bootstrap();
