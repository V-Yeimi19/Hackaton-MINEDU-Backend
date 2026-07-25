import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { RedisPubSubService } from '../redis/redis-pubsub.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly redisPubSub: RedisPubSubService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    try {
      const roleVersion = await this.redisPubSub.get(`auth:role-version:${payload.sub}`);
      if (roleVersion) {
        const changedAtMs = Number(roleVersion);
        const issuedAtMs = (payload.iat ?? 0) * 1000;
        if (issuedAtMs < changedAtMs) {
          throw new UnauthorizedException(
            'Tu sesión expiró porque tu rol cambió, vuelve a iniciar sesión',
          );
        }
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(`No se pudo verificar la versión de rol (Redis): ${(error as Error).message}`);
    }
    return payload;
  }
}
