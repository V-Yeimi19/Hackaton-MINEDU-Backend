import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { requestLogger } from './common/middleware/request-logger.middleware';
import { serviceRoutes } from './config/services.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Gateway');

  app.use(helmet());
  app.use(requestLogger);
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  for (const route of serviceRoutes) {
    const target = configService.get<string>(route.envKey);
    if (!target) {
      logger.warn(`Skipping proxy for "${route.prefix}": ${route.envKey} not set`);
      continue;
    }

    app.use(
      `/api/${route.prefix}`,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^/api/${route.prefix}`]: '' },
      }),
    );
    logger.log(`Proxy ready: /api/${route.prefix} -> ${target}`);
  }

  const port = configService.get<number>('GATEWAY_PORT') ?? 3000;
  await app.listen(port);
  logger.log(`Gateway listening on port ${port}`);
}

bootstrap();
