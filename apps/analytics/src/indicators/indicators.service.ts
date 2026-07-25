import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '@minedu/common';

const PRESENT_STATUSES = ['PRESENT', 'LATE'];

interface AttendanceEventPayload {
  studentId: string;
  classroomId: string;
  status: string;
  previousStatus?: string | null;
}

interface GradeEventPayload {
  studentId: string;
  classroomId: string;
  score: number;
}

@Injectable()
export class IndicatorsService {
  private readonly logger = new Logger(IndicatorsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private http: HttpService,
  ) {}

  private get classroomUrl() {
    return this.config.get<string>('CLASSROOM_SERVICE_INTERNAL_URL');
  }

  private get internalKey() {
    return this.config.get<string>('INTERNAL_API_KEY');
  }

  async recalculateAttendance(payload: AttendanceEventPayload) {
    const { studentId, classroomId, status, previousStatus } = payload;
    const isNewRecord = previousStatus === undefined || previousStatus === null;
    const isPresent = PRESENT_STATUSES.includes(status);
    const wasPresent = previousStatus ? PRESENT_STATUSES.includes(previousStatus) : false;

    const existing = await this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });

    let totalCount = existing?.totalCount ?? 0;
    let presentCount = existing?.presentCount ?? 0;

    if (isNewRecord) {
      totalCount += 1;
      if (isPresent) presentCount += 1;
    } else {
      if (wasPresent && !isPresent) presentCount -= 1;
      if (!wasPresent && isPresent) presentCount += 1;
    }

    const attendanceRate = totalCount > 0 ? presentCount / totalCount : 0;

    return this.prisma.studentIndicator.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: { totalCount, presentCount, attendanceRate, participationScore: attendanceRate },
      create: { studentId, classroomId, totalCount, presentCount, attendanceRate, participationScore: attendanceRate },
    });
  }

  async recalculateGrade(payload: GradeEventPayload) {
    const { studentId, classroomId, score } = payload;

    const existing = await this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });

    const prevGradeSum = existing?.gradeSum ?? 0;
    const prevGradeCount = existing?.gradeCount ?? 0;
    const newGradeSum = prevGradeSum + score;
    const newGradeCount = prevGradeCount + 1;
    const avgGrade = newGradeCount > 0 ? newGradeSum / newGradeCount : 0;

    return this.prisma.studentIndicator.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: { gradeSum: newGradeSum, gradeCount: newGradeCount, avgGrade },
      create: {
        studentId,
        classroomId,
        gradeSum: newGradeSum,
        gradeCount: newGradeCount,
        avgGrade,
      },
    });
  }

  async recalculateAllGrades(studentId: string, classroomId: string) {
    const { data: grades } = await firstValueFrom(
      this.http.get<{ score: number }[]>(
        `${this.classroomUrl}/internal/classroom/${classroomId}/grades`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );

    const studentGrades = grades.filter((g: any) => g.studentId === studentId);
    const gradeSum = studentGrades.reduce((sum, g) => sum + g.score, 0);
    const gradeCount = studentGrades.length;
    const avgGrade = gradeCount > 0 ? gradeSum / gradeCount : 0;

    return this.prisma.studentIndicator.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: { gradeSum, gradeCount, avgGrade },
      create: { studentId, classroomId, gradeSum, gradeCount, avgGrade },
    });
  }

  async findByClassroom(classroomId: string, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.studentIndicator.findMany({
        where: { classroomId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.studentIndicator.count({ where: { classroomId } }),
    ]);

    return { items, total, page: pagination.page, limit: pagination.limit };
  }

  async findByStudentAndClassroom(studentId: string, classroomId: string) {
    return this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });
  }

  async findByStudent(studentId: string, pagination: PaginationDto) {
    const [items, total] = await Promise.all([
      this.prisma.studentIndicator.findMany({
        where: { studentId },
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.studentIndicator.count({ where: { studentId } }),
    ]);

    return { items, total, page: pagination.page, limit: pagination.limit };
  }
}
