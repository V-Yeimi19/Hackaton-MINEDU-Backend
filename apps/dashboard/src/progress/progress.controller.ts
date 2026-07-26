import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { ProgressService } from './progress.service';
import { UpdateCourseProgressDto } from './dto/update-course-progress.dto';

// Sin prefijo 'dashboard': el Gateway ya recorta /api/dashboard antes de
// reenviar — ver el mismo comentario en aggregation.controller.ts.
@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('course/:courseId/progress')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  getCourseProgress(@Param('courseId') courseId: string) {
    return this.progressService.getCourseProgress(courseId);
  }

  @Patch('course/:courseId/progress')
  @Roles(Role.DOCENTE, Role.ADMIN)
  updateCourseProgress(@Param('courseId') courseId: string, @Body() dto: UpdateCourseProgressDto) {
    return this.progressService.updateCourseProgress(courseId, dto);
  }

  @Get('classroom/:classroomId/progress')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  getClassroomProgress(@Param('classroomId') classroomId: string) {
    return this.progressService.getClassroomProgress(classroomId);
  }
}
