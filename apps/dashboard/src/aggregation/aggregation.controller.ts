import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, CurrentUser, JwtPayload } from '@minedu/common';
import { AggregationService } from './aggregation.service';
import { TrendsQueryDto } from './dto/trends-query.dto';

// Sin prefijo 'dashboard': el Gateway ya recorta /api/dashboard antes de
// reenviar (igual que analytics/classroom/etc. con su propio prefijo),
// repetirlo aquí duplicaría el segmento y rompería el ruteo (404).
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AggregationController {
  constructor(private readonly aggregationService: AggregationService) {}

  @Get('national-summary')
  @Roles(Role.ADMIN)
  getNationalSummary() {
    return this.aggregationService.getNationalSummary();
  }

  @Get('institution/:id/summary')
  @Roles(Role.DIRECTIVO, Role.ADMIN)
  async getInstitutionSummary(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    if (user.role === Role.DIRECTIVO) {
      await this.aggregationService.assertDirectorOwnsInstitution(id, user.sub);
    }
    return this.aggregationService.getInstitutionSummary(id);
  }

  @Get('trends')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  async getTrends(@Query() query: TrendsQueryDto, @CurrentUser() user: JwtPayload) {
    if (query.scope === 'INSTITUTION' && user.role === Role.DIRECTIVO) {
      await this.aggregationService.assertDirectorOwnsInstitution(query.scopeId as string, user.sub);
    }
    return this.aggregationService.getTrends(query.scope, query.scopeId, query.metric, query.months ?? 6);
  }
}
