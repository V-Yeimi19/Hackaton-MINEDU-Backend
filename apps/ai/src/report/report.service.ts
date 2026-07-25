import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateReportDto, ReportFilterDto } from './dto/report.dto';
import PDFDocument from 'pdfkit';

interface EnrollmentData {
  studentId: string;
  student: { id: string; fullName: string };
}

interface CourseData {
  id: string;
  name: string;
  classroomId: string;
}

interface ClassroomData {
  id: string;
  name: string;
  gradeLevel: string;
  teacherId: string;
  courses: CourseData[];
  enrollments: EnrollmentData[];
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: string;
}

interface GradeRecord {
  id: string;
  studentId: string;
  evaluation: string;
  score: number;
  date: string;
}

interface IndicatorRecord {
  studentId: string;
  classroomId: string;
  attendanceRate: number;
  avgGrade: number;
  participationScore: number;
}

interface RiskRecord {
  studentId: string;
  classroomId: string;
  level: string;
  reasons: string[];
  detectedAt: string;
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

  private get internalKey() {
    return this.config.get<string>('INTERNAL_API_KEY');
  }

  private async fetchClassroom(classroomId: string): Promise<ClassroomData> {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.classroomUrl}/internal/classroom/${classroomId}`, {
          headers: { 'x-internal-key': this.internalKey },
        }),
      );
      return data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        throw new NotFoundException('Aula no encontrada');
      }
      throw err;
    }
  }

  private async fetchAttendances(classroomId: string): Promise<AttendanceRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.classroomUrl}/internal/classroom/${classroomId}/attendances`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data;
  }

  private async fetchGrades(classroomId: string): Promise<GradeRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.classroomUrl}/internal/classroom/${classroomId}/grades`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data;
  }

  private async fetchIndicators(classroomId: string): Promise<IndicatorRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.analyticsUrl}/internal/indicators/classroom/${classroomId}`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data;
  }

  private async fetchRisks(classroomId: string): Promise<RiskRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get(`${this.analyticsUrl}/internal/risk/classroom/${classroomId}`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data;
  }

  async generateReport(dto: GenerateReportDto) {
    const classroom = await this.fetchClassroom(dto.classroomId);
    if (!classroom) throw new NotFoundException('Aula no encontrada');

    const [attendances, grades, indicators, risks] = await Promise.all([
      this.fetchAttendances(dto.classroomId),
      this.fetchGrades(dto.classroomId),
      this.fetchIndicators(dto.classroomId),
      this.fetchRisks(dto.classroomId),
    ]);

    const weekStart = new Date(dto.weekStart);
    const weekEnd = new Date(dto.weekEnd);

    const weekAttendances = attendances.filter((a) => {
      const d = new Date(a.date);
      return d >= weekStart && d <= weekEnd;
    });

    const weekGrades = grades.filter((g) => {
      const d = new Date(g.date);
      return d >= weekStart && d <= weekEnd;
    });

    const studentIds = classroom.enrollments.map((e) => e.studentId);

    const indicatorMap = new Map(indicators.map((i) => [i.studentId, i]));
    const riskMap = new Map<string, RiskRecord[]>();
    for (const r of risks) {
      const list = riskMap.get(r.studentId) ?? [];
      list.push(r);
      riskMap.set(r.studentId, list);
    }

    const anomalies: { studentId: string; message: string }[] = [];
    for (const studentId of studentIds) {
      const studentRisks = riskMap.get(studentId) ?? [];
      const latestRisk = studentRisks[0];
      if (latestRisk && latestRisk.level !== 'NONE') {
        anomalies.push({
          studentId,
          message: `Riesgo ${latestRisk.level}: ${latestRisk.reasons.join(', ')}`,
        });
      }
      const indicator = indicatorMap.get(studentId);
      if (indicator) {
        if (indicator.attendanceRate < 0.8) {
          anomalies.push({
            studentId,
            message: `Asistencia baja: ${(indicator.attendanceRate * 100).toFixed(1)}%`,
          });
        }
        if (indicator.avgGrade < 11) {
          anomalies.push({
            studentId,
            message: `Promedio bajo: ${indicator.avgGrade.toFixed(1)}`,
          });
        }
      }
    }

    const attendanceSummary = this.buildAttendanceSummary(weekAttendances, studentIds);
    const gradeSummary = this.buildGradeSummary(weekGrades);

    const firstCourse = classroom.courses[0];

    const report = await this.prisma.report.create({
      data: {
        classroomId: dto.classroomId,
        courseId: firstCourse?.id ?? '',
        teacherId: classroom.teacherId,
        courseName: firstCourse?.name ?? '',
        className: classroom.name,
        weekStart,
        weekEnd,
        studentCount: classroom.enrollments.length,
        status: 'GENERATED',
      },
    });

    const pdfBuffer = await this.generatePdf({
      reportId: report.id,
      className: classroom.name,
      courseName: firstCourse?.name ?? '',
      gradeLevel: classroom.gradeLevel,
      teacherId: classroom.teacherId,
      weekStart,
      weekEnd,
      studentCount: classroom.enrollments.length,
      attendanceSummary,
      gradeSummary,
      anomalies,
    });

    try {
      const storageUrl = this.config.get<string>('STORAGE_SERVICE_INTERNAL_URL');
      const { data: uploadResult } = await firstValueFrom(
        this.http.post(
          `${storageUrl}/internal/upload`,
          {
            buffer: pdfBuffer.toString('base64'),
            originalName: `reporte-${report.id}.pdf`,
            mimeType: 'application/pdf',
          },
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      await this.prisma.report.update({
        where: { id: report.id },
        data: { pdfFileId: uploadResult.id },
      });
      report.pdfFileId = uploadResult.id;
    } catch (err) {
      this.logger.warn(`Fallo subiendo PDF a Storage para reporte ${report.id}`, err);
    }

    return {
      report,
      pdfBuffer,
      attendanceSummary,
      gradeSummary,
      anomalies,
    };
  }

  async findAll(filter: ReportFilterDto) {
    const where: Record<string, string> = {};
    if (filter.classroomId) where.classroomId = filter.classroomId;
    if (filter.courseId) where.courseId = filter.courseId;

    return this.prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Reporte no encontrado');
    return report;
  }

  async findAllClassrooms() {
    const { data } = await firstValueFrom(
      this.http.get(`${this.classroomUrl}/internal/classrooms`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data;
  }

  private buildAttendanceSummary(attendances: AttendanceRecord[], studentIds: string[]) {
    const summary: Record<string, { present: number; absent: number; late: number; excused: number; total: number }> = {};

    for (const sid of studentIds) {
      summary[sid] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }

    for (const a of attendances) {
      const s = summary[a.studentId];
      if (!s) continue;
      s.total++;
      if (a.status === 'PRESENT') s.present++;
      else if (a.status === 'ABSENT') s.absent++;
      else if (a.status === 'LATE') s.late++;
      else if (a.status === 'EXCUSED') s.excused++;
    }

    return summary;
  }

  private buildGradeSummary(grades: GradeRecord[]) {
    const summary: Record<string, { grades: number[]; avg: number; evaluations: string[] }> = {};

    for (const g of grades) {
      if (!summary[g.studentId]) {
        summary[g.studentId] = { grades: [], avg: 0, evaluations: [] };
      }
      summary[g.studentId].grades.push(g.score);
      summary[g.studentId].evaluations.push(g.evaluation);
    }

    for (const sid of Object.keys(summary)) {
      const grades = summary[sid].grades;
      summary[sid].avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
    }

    return summary;
  }

  private generatePdf(data: {
    reportId: string;
    className: string;
    courseName: string;
    gradeLevel: string;
    teacherId: string;
    weekStart: Date;
    weekEnd: Date;
    studentCount: number;
    attendanceSummary: Record<string, { present: number; absent: number; late: number; excused: number; total: number }>;
    gradeSummary: Record<string, { grades: number[]; avg: number; evaluations: string[] }>;
    anomalies: { studentId: string; message: string }[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(20).text('Reporte Semanal', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Reporte ID: ${data.reportId}`);
      doc.text(`Aula: ${data.className}`);
      doc.text(`Curso: ${data.courseName} (${data.gradeLevel})`);
      doc.text(`Docente: ${data.teacherId}`);
      doc.text(`Periodo: ${data.weekStart.toLocaleDateString()} - ${data.weekEnd.toLocaleDateString()}`);
      doc.text(`N. de alumnos: ${data.studentCount}`);
      doc.moveDown();

      doc.fontSize(14).text('Resumen de Asistencia', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      for (const [sid, att] of Object.entries(data.attendanceSummary)) {
        doc.text(`${sid}: Presentes ${att.present}, Ausentes ${att.absent}, Tardanzas ${att.late}, Excusas ${att.excused} (${att.total} registros)`);
      }
      doc.moveDown();

      if (Object.keys(data.gradeSummary).length > 0) {
        doc.fontSize(14).text('Resumen de Calificaciones', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const [sid, gr] of Object.entries(data.gradeSummary)) {
          doc.text(`${sid}: Promedio ${gr.avg.toFixed(1)} (${gr.evaluations.join(', ')})`);
        }
        doc.moveDown();
      }

      if (data.anomalies.length > 0) {
        doc.fontSize(14).text('Anomalias Detectadas', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const anomaly of data.anomalies) {
          doc.text(`- ${anomaly.studentId}: ${anomaly.message}`);
        }
      } else {
        doc.fontSize(10).text('No se detectaron anomalias.');
      }

      doc.end();
    });
  }
}
