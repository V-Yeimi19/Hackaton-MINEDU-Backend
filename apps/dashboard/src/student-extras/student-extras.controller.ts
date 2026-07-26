import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, CurrentUser, JwtPayload } from '@minedu/common';
import { StudentExtrasService } from './student-extras.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

// 'student', no 'dashboard/student': el Gateway ya recorta /api/dashboard
// antes de reenviar — ver el mismo comentario en aggregation.controller.ts.
@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentExtrasController {
  constructor(private readonly studentExtrasService: StudentExtrasService) {}

  @Get(':studentId/extras')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  getExtras(@Param('studentId') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.studentExtrasService.getExtras(studentId, user.sub, user.role);
  }

  @Post(':studentId/incidents')
  @Roles(Role.DOCENTE, Role.ADMIN)
  createIncident(
    @Param('studentId') studentId: string,
    @Body() dto: CreateIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.studentExtrasService.createIncident(studentId, dto, user.sub);
  }
}
