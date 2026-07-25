import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, PaginationDto } from '@minedu/common';
import { RecommendationService } from './recommendation.service';

@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get('classroom/:classroomId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findByClassroom(@Param('classroomId') classroomId: string, @Query() pagination: PaginationDto) {
    return this.recommendationService.findByClassroom(classroomId, pagination);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudent(@Param('studentId') studentId: string, @Query() pagination: PaginationDto) {
    return this.recommendationService.findByStudent(studentId, pagination);
  }

  @Patch(':id/dismiss')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  dismiss(@Param('id') id: string) {
    return this.recommendationService.dismiss(id);
  }
}
