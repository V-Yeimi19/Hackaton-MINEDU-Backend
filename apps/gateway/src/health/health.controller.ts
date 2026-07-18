import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'gateway', timestamp: new Date().toISOString() };
  }
}
