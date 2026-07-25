// digital-twin/digital-twin.controller.ts
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { DigitalTwinService } from './digital-twin.service';

@Controller('digital-twin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DigitalTwinController {
  constructor(private readonly digitalTwinService: DigitalTwinService) {}

  @Get('classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  getClassroomTwin(@Param('classroomId') classroomId: string) {
    return this.digitalTwinService.getClassroomTwin(classroomId);
  }

  @Get('classroom/:classroomId/student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  getStudentTwin(
    @Param('classroomId') classroomId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.digitalTwinService.getStudentTwin(studentId, classroomId);
  }
}