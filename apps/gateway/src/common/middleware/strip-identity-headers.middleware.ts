import { NextFunction, Request, Response } from 'express';

export function stripForwardedIdentityHeaders(req: Request, _res: Response, next: NextFunction): void {
  delete req.headers['x-user-id'];
  delete req.headers['x-user-email'];
  delete req.headers['x-user-role'];
  next();
}
