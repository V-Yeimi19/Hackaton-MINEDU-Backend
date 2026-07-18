import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class InternalKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.headers['x-internal-key'];
    const expected = this.configService.get<string>('INTERNAL_API_KEY');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Clave interna inválida');
    }
    return true;
  }
}
