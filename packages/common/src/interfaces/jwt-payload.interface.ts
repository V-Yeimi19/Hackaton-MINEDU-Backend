import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  iat?: number;
}

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
