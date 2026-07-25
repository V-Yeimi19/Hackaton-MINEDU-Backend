import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenerateInstitutionReportDto,
  GenerateClassroomReportDto,
  GenerateStudentReportDto,
  ReportFilterDto,
} from './dto/report.dto';
import PDFDocument from 'pdfkit';

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
  evaluation: string;
  score: number;
  date: string;
}

interface RiskRecord {
  studentId: string;
  level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt: string;
  reasons?: string[];
}

interface IndicatorRecord {
  studentId: string;
  classroomId: string;
  attendanceRate: number;
  avgGrade: number;
  competencyScore?: number;
}

interface RecommendationRecord {
  studentId: string;
  classroomId: string;
  type: string;
  message: string;
  source: string;
  status: string;
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

  private async fetchIndicators(classroomId: string): Promise<IndicatorRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get<IndicatorRecord[]>(
        `${this.analyticsUrl}/internal/indicators/classroom/${classroomId}`,
        { headers: { 'x-internal-key': this.internalKey } },
      ),
    );
    return data;
  }

  private async fetchRecommendations(classroomId: string): Promise<RecommendationRecord[]> {
    const { data } = await firstValueFrom(
      this.http.get<RecommendationRecord[]>(
        `${this.analyticsUrl}/internal/recommendations/classroom/${classroomId}`,
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

    const pdfBuffer = await this.generatePdf({
      reportId: report.id,
      periodStart,
      periodEnd,
      gradeLevel: dto.gradeLevel ?? 'Todas',
      courseName: dto.courseId ?? 'Todos',
      classroomCount: summaries.length,
      studentCount: studentIds.size,
      avgAttendanceRate: report.avgAttendanceRate,
      avgGrade: report.avgGrade,
      riskCounts,
      summaries,
    });

    try {
      const { data: uploadResult } = await firstValueFrom(
        this.http.post(
          `${this.storageUrl}/internal/upload`,
          {
            buffer: pdfBuffer.toString('base64'),
            originalName: `reporte-institucional-${report.id}.pdf`,
            mimeType: 'application/pdf',
          },
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      await this.prisma.institutionReport.update({
        where: { id: report.id },
        data: { pdfFileId: uploadResult.id },
      });
      report.pdfFileId = uploadResult.id;
    } catch (err) {
      this.logger.warn(`Fallo subiendo PDF a Storage para reporte ${report.id}`, err as Error);
    }

    return { report, classroomSummaries: summaries, pdfBuffer };
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

  async getPdfDownloadUrl(id: string): Promise<string> {
    const report = await this.findOne(id);
    if (!report.pdfFileId) {
      throw new NotFoundException('Este reporte no tiene un PDF generado');
    }
    const { data } = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.storageUrl}/internal/${report.pdfFileId}/download-url`, {
        headers: { 'x-internal-key': this.internalKey },
      }),
    );
    return data.url;
  }

  async generateClassroomReport(dto: GenerateClassroomReportDto): Promise<Buffer> {
    const classroom = await this.fetchClassroomById(dto.classroomId);
    if (!classroom) throw new NotFoundException('Aula no encontrada');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const [attendances, grades, risks, indicators] = await Promise.all([
      this.fetchAttendances(dto.classroomId),
      this.fetchGrades(dto.classroomId),
      this.fetchRisks(dto.classroomId),
      this.fetchIndicators(dto.classroomId),
    ]);

    const inPeriod = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= periodStart && d <= periodEnd;
    };

    const periodAttendances = attendances.filter((a) => inPeriod(a.date));
    const periodGrades = grades.filter((g) => inPeriod(g.date));

    const indicatorMap = new Map(indicators.map((i) => [i.studentId, i]));
    const latestRiskByStudent = new Map<string, RiskRecord>();
    for (const r of risks) {
      if (!latestRiskByStudent.has(r.studentId)) latestRiskByStudent.set(r.studentId, r);
    }

    const studentRows = classroom.studentIds.map((sid) => {
      const sAttendances = periodAttendances.filter((a) => a.studentId === sid);
      const presentCount = sAttendances.filter((a) => a.status === 'PRESENT').length;
      const attendanceRate = sAttendances.length > 0 ? presentCount / sAttendances.length : 0;

      const sGrades = periodGrades.filter((g) => g.studentId === sid);
      const avgGrade = sGrades.length > 0
        ? sGrades.reduce((sum, g) => sum + g.score, 0) / sGrades.length
        : null;

      const risk = latestRiskByStudent.get(sid);
      const indicator = indicatorMap.get(sid);

      return {
        studentId: sid,
        attendanceRate,
        avgGrade,
        riskLevel: risk?.level ?? 'NONE',
        competencyScore: indicator?.competencyScore,
      };
    });

    const riskCounts: RiskCounts = { NONE: 0, LOW: 0, MEDIUM: 0, HIGH: 0 };
    for (const row of studentRows) riskCounts[row.riskLevel as keyof RiskCounts]++;

    return this.generateClassroomPdf({
      classroomId: dto.classroomId,
      className: classroom.name,
      courseName: classroom.course.name,
      gradeLevel: classroom.course.gradeLevel,
      periodStart,
      periodEnd,
      studentCount: classroom.studentIds.length,
      studentRows,
      riskCounts,
    });
  }

  async generateStudentReport(dto: GenerateStudentReportDto): Promise<Buffer> {
    const classroom = await this.fetchClassroomById(dto.classroomId);
    if (!classroom) throw new NotFoundException('Aula no encontrada');

    if (!classroom.studentIds.includes(dto.studentId)) {
      throw new NotFoundException('El estudiante no pertenece a esta aula');
    }

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    const [attendances, grades, risks, indicators, recommendations] = await Promise.all([
      this.fetchAttendances(dto.classroomId),
      this.fetchGrades(dto.classroomId),
      this.fetchRisks(dto.classroomId),
      this.fetchIndicators(dto.classroomId),
      this.fetchRecommendations(dto.classroomId),
    ]);

    const inPeriod = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= periodStart && d <= periodEnd;
    };

    const studentAttendances = attendances
      .filter((a) => a.studentId === dto.studentId && inPeriod(a.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const studentGrades = grades
      .filter((g) => g.studentId === dto.studentId && inPeriod(g.date))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const studentRisk = risks.find((r) => r.studentId === dto.studentId);
    const studentIndicator = indicators.find((i) => i.studentId === dto.studentId);
    const studentRecommendations = recommendations.filter((r) => r.studentId === dto.studentId);

    const presentCount = studentAttendances.filter((a) => a.status === 'PRESENT').length;
    const attendanceRate = studentAttendances.length > 0 ? presentCount / studentAttendances.length : 0;

    return this.generateStudentPdf({
      studentId: dto.studentId,
      classroomId: dto.classroomId,
      className: classroom.name,
      courseName: classroom.course.name,
      gradeLevel: classroom.course.gradeLevel,
      periodStart,
      periodEnd,
      attendanceSummary: {
        total: studentAttendances.length,
        present: presentCount,
        absent: studentAttendances.filter((a) => a.status === 'ABSENT').length,
        late: studentAttendances.filter((a) => a.status === 'LATE').length,
        excused: studentAttendances.filter((a) => a.status === 'EXCUSED').length,
        rate: attendanceRate,
      },
      grades: studentGrades.map((g) => ({ evaluation: g.evaluation, score: g.score, date: new Date(g.date) })),
      avgGrade: studentIndicator?.avgGrade ?? null,
      competencyScore: studentIndicator?.competencyScore ?? null,
      risk: studentRisk ? { level: studentRisk.level, reasons: studentRisk.reasons ?? [] } : null,
      recommendations: studentRecommendations.map((r) => ({ type: r.type, message: r.message })),
    });
  }

  private async fetchClassroomById(classroomId: string): Promise<ClassroomData | null> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<ClassroomData>(
          `${this.classroomUrl}/internal/classroom/${classroomId}`,
          { headers: { 'x-internal-key': this.internalKey } },
        ),
      );
      return data;
    } catch {
      return null;
    }
  }

  private generateClassroomPdf(data: {
    classroomId: string;
    className: string;
    courseName: string;
    gradeLevel: string;
    periodStart: Date;
    periodEnd: Date;
    studentCount: number;
    studentRows: {
      studentId: string;
      attendanceRate: number;
      avgGrade: number | null;
      riskLevel: string;
      competencyScore?: number;
    }[];
    riskCounts: RiskCounts;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(20).text('Reporte por Aula', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Aula: ${data.className}`);
      doc.text(`Curso: ${data.courseName} (${data.gradeLevel})`);
      doc.text(`Periodo: ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}`);
      doc.text(`Estudiantes: ${data.studentCount}`);
      doc.moveDown();

      doc.fontSize(14).text('Distribucion de Riesgo', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Ninguno: ${data.riskCounts.NONE}  |  Bajo: ${data.riskCounts.LOW}  |  Medio: ${data.riskCounts.MEDIUM}  |  Alto: ${data.riskCounts.HIGH}`);
      doc.moveDown();

      doc.fontSize(14).text('Detalle por Estudiante', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9);

      const header = 'ID  |  Asistencia  |  Promedio  |  Competencia  |  Riesgo';
      doc.text(header);
      doc.text('-'.repeat(header.length));

      for (const row of data.studentRows) {
        const attStr = `${(row.attendanceRate * 100).toFixed(1)}%`;
        const avgStr = row.avgGrade !== null ? row.avgGrade.toFixed(1) : 'N/A';
        const compStr = row.competencyScore != null ? row.competencyScore.toFixed(2) : 'N/A';
        doc.text(`${row.studentId.slice(0, 8)}...  |  ${attStr.padEnd(10)}  |  ${avgStr.padEnd(8)}  |  ${compStr.padEnd(11)}  |  ${row.riskLevel}`);
      }

      doc.end();
    });
  }

  private generateStudentPdf(data: {
    studentId: string;
    classroomId: string;
    className: string;
    courseName: string;
    gradeLevel: string;
    periodStart: Date;
    periodEnd: Date;
    attendanceSummary: {
      total: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      rate: number;
    };
    grades: { evaluation: string; score: number; date: Date }[];
    avgGrade: number | null;
    competencyScore: number | null;
    risk: { level: string; reasons: string[] } | null;
    recommendations: { type: string; message: string }[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(20).text('Reporte por Estudiante', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Estudiante: ${data.studentId}`);
      doc.text(`Aula: ${data.className}`);
      doc.text(`Curso: ${data.courseName} (${data.gradeLevel})`);
      doc.text(`Periodo: ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}`);
      doc.moveDown();

      doc.fontSize(14).text('Asistencia', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      doc.text(`Tasa de asistencia: ${(data.attendanceSummary.rate * 100).toFixed(1)}%`);
      doc.text(`Presente: ${data.attendanceSummary.present}  |  Ausente: ${data.attendanceSummary.absent}  |  Tardanza: ${data.attendanceSummary.late}  |  Excusa: ${data.attendanceSummary.excused}`);
      doc.text(`Total registros: ${data.attendanceSummary.total}`);
      doc.moveDown();

      if (data.grades.length > 0) {
        doc.fontSize(14).text('Calificaciones', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const g of data.grades) {
          doc.text(`${g.date.toLocaleDateString()} - ${g.evaluation}: ${g.score.toFixed(1)}`);
        }
        doc.text(`Promedio: ${data.avgGrade !== null ? data.avgGrade.toFixed(1) : 'N/A'}`);
        doc.moveDown();
      }

      if (data.competencyScore != null) {
        doc.fontSize(14).text('Competencia', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Score promedio: ${data.competencyScore.toFixed(2)}`);
        doc.moveDown();
      }

      doc.fontSize(14).text('Riesgo', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      if (data.risk) {
        doc.text(`Nivel: ${data.risk.level}`);
        if (data.risk.reasons.length > 0) {
          doc.text(`Razones: ${data.risk.reasons.join(', ')}`);
        }
      } else {
        doc.text('Sin evaluacion de riesgo');
      }
      doc.moveDown();

      if (data.recommendations.length > 0) {
        doc.fontSize(14).text('Recomendaciones', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const r of data.recommendations) {
          doc.text(`- [${r.type}] ${r.message}`);
        }
      }

      doc.end();
    });
  }

  private generatePdf(data: {
    reportId: string;
    periodStart: Date;
    periodEnd: Date;
    gradeLevel: string;
    courseName: string;
    classroomCount: number;
    studentCount: number;
    avgAttendanceRate: number;
    avgGrade: number;
    riskCounts: RiskCounts;
    summaries: ClassroomSummary[];
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      doc.fontSize(20).text('Reporte Institucional', { align: 'center' });
      doc.moveDown();

      doc.fontSize(12).text(`Reporte ID: ${data.reportId}`);
      doc.text(`Periodo: ${data.periodStart.toLocaleDateString()} - ${data.periodEnd.toLocaleDateString()}`);
      doc.text(`Grado: ${data.gradeLevel}`);
      doc.text(`Curso: ${data.courseName}`);
      doc.text(`Aulas: ${data.classroomCount}`);
      doc.text(`Estudiantes: ${data.studentCount}`);
      doc.moveDown();

      doc.fontSize(14).text('Resumen General', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Asistencia promedio: ${(data.avgAttendanceRate * 100).toFixed(1)}%`);
      doc.text(`Promedio general: ${data.avgGrade.toFixed(1)}`);
      doc.moveDown();

      doc.fontSize(14).text('Distribucion de Riesgo', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).text(`Ninguno: ${data.riskCounts.NONE}`);
      doc.text(`Bajo: ${data.riskCounts.LOW}`);
      doc.text(`Medio: ${data.riskCounts.MEDIUM}`);
      doc.text(`Alto: ${data.riskCounts.HIGH}`);
      doc.moveDown();

      if (data.summaries.length > 0) {
        doc.fontSize(14).text('Detalle por Aula', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        for (const s of data.summaries) {
          doc.text(
            `${s.className} (${s.courseName}, ${s.gradeLevel}): ` +
              `Asistencia ${(s.attendanceRate * 100).toFixed(1)}% | ` +
              `Promedio ${s.avgGrade !== null ? s.avgGrade.toFixed(1) : 'N/A'} | ` +
              `Riesgo N:${s.riskCounts.NONE} B:${s.riskCounts.LOW} M:${s.riskCounts.MEDIUM} A:${s.riskCounts.HIGH}`,
          );
        }
      }

      doc.end();
    });
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
