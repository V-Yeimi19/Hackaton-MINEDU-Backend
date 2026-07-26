import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassroomClientService } from '../clients/classroom-client.service';
import { UpdateCourseProgressDto } from './dto/update-course-progress.dto';

function percentage(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classroomClient: ClassroomClientService,
  ) {}

  async getCourseProgress(courseId: string) {
    const progress = await this.prisma.courseProgress.findUnique({ where: { courseId } });
    const totalUnits = progress?.totalUnits ?? 0;
    const completedUnits = progress?.completedUnits ?? 0;
    return { courseId, totalUnits, completedUnits, percentage: percentage(completedUnits, totalUnits) };
  }

  async updateCourseProgress(courseId: string, dto: UpdateCourseProgressDto) {
    const progress = await this.prisma.courseProgress.upsert({
      where: { courseId },
      update: { totalUnits: dto.totalUnits, completedUnits: dto.completedUnits },
      create: { courseId, totalUnits: dto.totalUnits, completedUnits: dto.completedUnits },
    });
    return { ...progress, percentage: percentage(progress.completedUnits, progress.totalUnits) };
  }

  async getClassroomProgress(classroomId: string) {
    const classroom = await this.classroomClient.getClassroom(classroomId);
    const courseIds: string[] = (classroom.courses ?? []).map((c: any) => c.id);

    const progresses = courseIds.length
      ? await this.prisma.courseProgress.findMany({ where: { courseId: { in: courseIds } } })
      : [];

    const totalUnits = progresses.reduce((sum, p) => sum + p.totalUnits, 0);
    const completedUnits = progresses.reduce((sum, p) => sum + p.completedUnits, 0);

    return {
      classroomId,
      courseCount: courseIds.length,
      totalUnits,
      completedUnits,
      percentage: percentage(completedUnits, totalUnits),
    };
  }
}
