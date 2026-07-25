import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, PaginationDto } from '@minedu/common';
import { IndicatorsService } from './indicators.service';

@Controller('indicators')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get('classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findByClassroom(@Param('classroomId') classroomId: string, @Query() pagination: PaginationDto) {
    return this.indicatorsService.findByClassroom(classroomId, pagination);
  }

  @Get('student/:studentId/classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudentAndClassroom(
    @Param('studentId') studentId: string,
    @Param('classroomId') classroomId: string,
  ) {
    return this.indicatorsService.findByStudentAndClassroom(studentId, classroomId);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudent(@Param('studentId') studentId: string, @Query() pagination: PaginationDto) {
    return this.indicatorsService.findByStudent(studentId, pagination);
  }
}
