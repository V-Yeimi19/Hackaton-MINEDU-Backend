import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateInstitutionReportDto, ReportFilterDto } from './dto/report.dto';

interface ClassroomData {
  id: string;
  name: string;
  studentIds: string[];
  course: { id: string; name: string; gradeLevel: string };
}

interface AttendanceRecord {
  studentId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
}

interface GradeRecord {
  studentId: string;
  score: number;
  date: string;
}

interface RiskRecord {
  studentId: string;
  level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt: string;
}

type RiskCounts = { NONE: number; LOW: number; MEDIUM: number; HIGH: number };

interface ClassroomSummary {
  classroomId: string;
  className: string;
  courseName: string;
  gradeLevel: string;
  studentIds: string[];
  attendanceRate: number;
  avgGrade: number | null;
  riskCounts: RiskCounts;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private http: HttpService,
  ) {}

  private get classroomUrl() {
    return this.config.get<string>('CLASSROOM_SERVICE_INTERNAL_URL');
  }

  private get analyticsUrl() {
    return this.config.get<string>('ANALYTICS_SERVICE_INTERNAL_URL');
  }

  private get storageUrl() {
    return this.config.get<string>('STORAGE_SERVICE_INTERNAL_URL');
  }

  private get internalKey() {
    return this.config.get<string>('INTERNAL_API_KEY');
  }

  private async fetchClassrooms(gradeLevel?: string, courseId?: string): Promise<ClassroomData[]> {
    const { data } = await firstValueFrom(
      this.http.get<ClassroomData[]>(`${this.classroomUrl}/internal/classrooms`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data.filter((c) => {
      if (courseId && c.course.id !== courseId) return false;
      if (gradeLevel && c.course.gradeLevel !== gradeLevel) return false;
      return true;
    });
  }

  private async fetchAttendances(classroomId: string): Promise<AttendanceRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get<AttendanceRecord[]>(
        `${this.classroomUrl}/internal/classroom/${classroomId}/attendances`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    return data;
  }

  private async fetchGrades(classroomId: string): Promise<GradeRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get<GradeRecord[]>(
        `${this.classroomUrl}/internal/classroom/${classroomId}/grades`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    return data;
  }

  private async fetchRisks(classroomId: string): Promise<RiskRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get<RiskRecord[]>(
        `${this.analyticsUrl}/internal/risk/classroom/${classroomId}`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    return data;
  }

  private async summarizeClassroom(
    classroom: ClassroomData,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ClassroomSummary> {
    const [attendances, grades, risks] = await Promise.all([
      this.fetchAttendances(classroom.id),
      this.fetchGrades(classroom.id),
      this.fetchRisks(classroom.id),
    ]);

    const inPeriod = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= periodStart && d <= periodEnd;
    };

    const periodAttendances = attendances.filter((a) => inPeriod(a.date));
    const periodGrades = grades.filter((g) => inPeriod(g.date));

    const presentCount = periodAttendances.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate = periodAttendances.length > 0 ? presentCount / periodAttendances.length : 0;

    const avgGrade =
      periodGrades.length > 0
        ? periodGrades.reduce((sum, g) => sum + g.score, 0) / periodGrades.length
        : null;

    const latestRiskByStudent = new Map<string, RiskRecord['level']>();
    for (const r of risks) {
      if (!latestRiskByStudent.has(r.studentId)) latestRiskByStudent.set(r.studentId, r.level);
    }
    const riskCounts: RiskCounts = { NONE: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const level of latestRiskByStudent.values()) riskCounts[level]++;

    return {
      classroomId: classroom.id,
      className: classroom.name,
      courseName: classroom.course.name,
      gradeLevel: classroom.course.gradeLevel,
      studentIds: classroom.studentIds,
      attendanceRate,
      avgGrade,
      riskCounts,
    };
  }

  async generateReport(dto: GenerateInstitutionReportDto, generatedBy: string) {
    const classrooms = await this.fetchClassrooms(dto.gradeLevel, dto.courseId);
    if (classrooms.length === 0) {
      throw new NotFoundException('No se encontraron aulas para el filtro indicado');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const summaries = await Promise.all(
      classrooms.map((c) => this.summarizeClassroom(c, periodStart, periodEnd)),
    );

    const studentIds = new Set<string>();
    const riskCounts: RiskCounts = { NONE: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
    let attendanceRateSum = 0;
    let gradeSum = 0;
    let gradeClassroomCount = 0;

    for (const s of summaries) {
      s.studentIds.forEach((id) => studentIds.add(id));
      attendanceRateSum += s.attendanceRate;
      if (s.avgGrade !== null) {
        gradeSum += s.avgGrade;
        gradeClassroomCount++;
      }
      (Object.keys(riskCounts) as (keyof RiskCounts)[]).forEach((level) => {
        riskCounts[level] += s.riskCounts[level];
      });
    }

    const report = await this.prisma.institutionReport.create({
      data: {
        gradeLevel: dto.gradeLevel ?? null,
        courseId: dto.courseId ?? null,
        periodStart,
        periodEnd,
        classroomCount: summaries.length,
        studentCount: studentIds.size,
        avgAttendanceRate: attendanceRateSum / summaries.length,
        avgGrade: gradeClassroomCount > 0 ? gradeSum / gradeClassroomCount : 0,
        riskCounts,
        generatedBy,
      },
    });

    const csv = this.buildCsv(summaries);

    try {
      const { data: uploadResult } = await firstValueFrom(
        this.http.post(
          `${this.storageUrl}/internal/upload`,
          {
            buffer: csv.toString('base64'),
            originalName: `reporte-institucional-${report.id}.csv`,
            mimeType: 'text/csv',
          },
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      await this.prisma.institutionReport.update({
        where: { id: report.id },
        data: { fileId: uploadResult.id },
      });
      report.fileId = uploadResult.id;
    } catch (err) {
      this.logger.warn(`Fallo subiendo CSV a Storage para reporte ${report.id}`, err as Error);
    }

    return { report, classroomSummaries: summaries };
  }

  async findAll(filter: ReportFilterDto) {
    const where: Record<string, string> = {};
    if (filter.gradeLevel) where.gradeLevel = filter.gradeLevel;
    if (filter.courseId) where.courseId = filter.courseId;

    return this.prisma.institutionReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.institutionReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const report = await this.findOne(id);
    if (!report.fileId) {
      throw new NotFoundException('Este reporte no tiene un archivo generado');
    }
    const { data } = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.storageUrl}/internal/${report.fileId}/download-url`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data.url;
  }

  private buildCsv(summaries: ClassroomSummary[]): Buffer {
    const header = [
      'classroomId',
      'className',
      'courseName',
      'gradeLevel',
      'studentCount',
      'attendanceRatePct',
      'avgGrade',
      'riskNone',
      'riskLow',
      'riskMedium',
      'riskHigh',
    ];

    const rows = summaries.map((s) => [
      s.classroomId,
      s.className,
      s.courseName,
      s.gradeLevel,
      s.studentIds.length,
      (s.attendanceRate * 100).toFixed(1),
      s.avgGrade !== null ? s.avgGrade.toFixed(1) : '',
      s.riskCounts.NONE,
      s.riskCounts.LOW,
      s.riskCounts.MEDIUM,
      s.riskCounts.HIGH,
    ]);

    const escape = (value: unknown) => {
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const lines = [header, ...rows].map((row) => row.map(escape).join(','));
    return Buffer.from(lines.join('\n'), 'utf-8');
  }
}
