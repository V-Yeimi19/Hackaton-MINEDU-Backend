import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { createJwtCheckMiddleware } from './common/middleware/jwt-check.middleware';
import { requestLogger } from './common/middleware/request-logger.middleware';
import { stripForwardedIdentityHeaders } from './common/middleware/strip-identity-headers.middleware';
import { serviceRoutes } from './config/services.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Gateway');

  app.use(stripForwardedIdentityHeaders);
  app.use(helmet());
  app.use(requestLogger);
  app.enableCors();
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit: configService.get<number>('RATE_LIMIT_MAX') ?? 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { statusCode: 429, message: 'Demasiadas solicitudes, intenta de nuevo más tarde' },
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const jwtCheck = createJwtCheckMiddleware(configService.get<string>('JWT_SECRET') as string);

  for (const route of serviceRoutes) {
    const target = configService.get<string>(route.envKey);
    if (!target) {
      logger.warn(`Skipping proxy for "${route.prefix}": ${route.envKey} not set`);
      continue;
    }

    if (!route.public) {
      app.use(`/api/${route.prefix}`, jwtCheck);
    }

    app.use(
      `/api/${route.prefix}`,
      createProxyMiddleware({
        target,
        changeOrigin: true,
        pathRewrite: { [`^/api/${route.prefix}`]: '' },
      }),
    );
    logger.log(
      `Proxy ready: /api/${route.prefix} -> ${target}${route.public ? ' (público)' : ' (JWT requerido)'}`,
    );
  }

  const port = configService.get<number>('GATEWAY_PORT') ?? 3000;
  await app.listen(port);
  logger.log(`Gateway listening on port ${port}`);
}

bootstrap();
