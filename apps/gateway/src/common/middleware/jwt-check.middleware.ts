import { Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const logger = new Logger('JwtCheck');

interface DecodedToken {
  sub: string;
  email: string;
  role: string;
}

export function createJwtCheckMiddleware(secret: string) {
  return function jwtCheckMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      res.status(401).json({ statusCode: 401, message: 'Token no proporcionado' });
      return;
    }

    try {
      const payload = jwt.verify(token, secret) as DecodedToken;
      req.headers['x-user-id'] = payload.sub;
      req.headers['x-user-email'] = payload.email;
      req.headers['x-user-role'] = payload.role;
      next();
    } catch (error) {
      logger.warn(`Token inválido: ${(error as Error).message}`);
      res.status(401).json({ statusCode: 401, message: 'Token inválido o expirado' });
    }
  };
}
