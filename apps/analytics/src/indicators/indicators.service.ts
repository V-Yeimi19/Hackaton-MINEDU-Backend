import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, Role } from '@minedu/common';

const PRESENT_STATUSES = ['PRESENT', 'LATE'];

const COMPETENCY_SCORE_MAP: Record<string, number> = {
  BASICO: 0.25,
  INTERMEDIO: 0.5,
  AVANZADO: 0.75,
  LOGRADO: 1.0,
};

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

interface CompetencyEventPayload {
  studentId: string;
  classroomId: string;
  level: string;
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

  async recalculateCompetency(payload: CompetencyEventPayload) {
    const { studentId, classroomId, level } = payload;
    const score = COMPETENCY_SCORE_MAP[level] ?? 0;

    const existing = await this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });

    const prevCount = existing?.competencyCount ?? 0;
    const prevSum = (existing?.competencyScore ?? 0) * prevCount;
    const newCount = prevCount + 1;
    const newCompetencyScore = newCount > 0 ? (prevSum + score) / newCount : 0;

    return this.prisma.studentIndicator.upsert({
      where: { studentId_classroomId: { studentId, classroomId } },
      update: { competencyScore: newCompetencyScore, competencyCount: newCount },
      create: { studentId, classroomId, competencyScore: newCompetencyScore, competencyCount: newCount },
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

  private async ensureFamiliarAccess(studentId: string, userId: string) {
    const { data: students } = await firstValueFrom(
      this.http.get<{ id: string }[]>(
        `${this.classroomUrl}/internal/students/familiar/${userId}`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    if (!students.some((s) => s.id === studentId)) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }
  }

  async findByStudentAndClassroom(studentId: string, classroomId: string, userId?: string, userRole?: Role) {
    if (userRole === Role.FAMILIAR && userId) {
      await this.ensureFamiliarAccess(studentId, userId);
    }
    return this.prisma.studentIndicator.findUnique({
      where: { studentId_classroomId: { studentId, classroomId } },
    });
  }

  async findByStudent(studentId: string, pagination: PaginationDto, userId?: string, userRole?: Role) {
    if (userRole === Role.FAMILIAR && userId) {
      await this.ensureFamiliarAccess(studentId, userId);
    }
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
