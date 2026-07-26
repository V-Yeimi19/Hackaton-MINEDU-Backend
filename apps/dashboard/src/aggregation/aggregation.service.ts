import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassroomClientService } from '../clients/classroom-client.service';
import { AnalyticsClientService } from '../clients/analytics-client.service';
import { average } from '../common/math.util';
import type { TrendMetric } from './dto/trends-query.dto';

const RISK_LEVELS = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
const NATIONAL_SUMMARY_CACHE_KEY = 'dashboard:national-summary';
const NATIONAL_SUMMARY_TTL_SECONDS = 300;
const INSTITUTION_SUMMARY_TTL_SECONDS = 300;

function emptyRiskCounts(): Record<string, number> {
  return Object.fromEntries(RISK_LEVELS.map((level) => [level, 0]));
}

/**
 * Fan-out sobre /internal/* de Classroom + Analytics (no hay ningún endpoint
 * agregado ya calculado a nivel institución/nacional en el sistema). A escala
 * de hackathon esto es aceptable con cache de 5 min; a escala real esto
 * debería pasar a ser event-driven (igual que StudentIndicator en Analytics)
 * en vez de recalcular en cada lectura.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classroomClient: ClassroomClientService,
    private readonly analyticsClient: AnalyticsClientService,
    private readonly redis: RedisPubSubService,
  ) {}

  async assertDirectorOwnsInstitution(institutionId: string, directorId: string): Promise<void> {
    const institutions = await this.classroomClient.getInstitutionsByDirector(directorId);
    if (!institutions.some((inst: any) => inst.id === institutionId)) {
      throw new ForbiddenException('No tienes acceso a esta institución');
    }
  }

  private async aggregateRisk(classroomIds: string[]): Promise<Record<string, number>> {
    const counts = emptyRiskCounts();
    const results = await Promise.all(
      classroomIds.map((id) => this.analyticsClient.getRiskByClassroom(id).catch(() => [])),
    );
    for (const risks of results) {
      for (const risk of risks) {
        counts[risk.level] = (counts[risk.level] ?? 0) + 1;
      }
    }
    return counts;
  }

  async getNationalSummary(skipCache = false) {
    if (!skipCache) {
      const cached = await this.redis.get(NATIONAL_SUMMARY_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    }

    const [institutions, classrooms, students] = await Promise.all([
      this.classroomClient.getAllInstitutions(),
      this.classroomClient.getAllClassrooms(),
      this.classroomClient.getAllStudents(),
    ]);

    const riskCounts = await this.aggregateRisk(classrooms.map((c: any) => c.id));

    const summary = {
      totalStudents: students.length,
      activeInstitutions: institutions.length,
      totalClassrooms: classrooms.length,
      riskCounts,
      calculatedAt: new Date().toISOString(),
    };

    await this.redis.set(NATIONAL_SUMMARY_CACHE_KEY, JSON.stringify(summary), NATIONAL_SUMMARY_TTL_SECONDS);
    return summary;
  }

  async getInstitutionSummary(institutionId: string, skipCache = false) {
    const cacheKey = `dashboard:institution-summary:${institutionId}`;
    if (!skipCache) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const allClassrooms = await this.classroomClient.getAllClassrooms();
    const institutionClassrooms = allClassrooms.filter((c: any) => c.institutionId === institutionId);

    if (institutionClassrooms.length === 0) {
      const institutions = await this.classroomClient.getAllInstitutions();
      if (!institutions.some((inst: any) => inst.id === institutionId)) {
        throw new NotFoundException('Institución no encontrada');
      }
    }

    const classroomIds = institutionClassrooms.map((c: any) => c.id);
    const indicatorLists = await Promise.all(
      classroomIds.map((id: string) => this.analyticsClient.getIndicatorsByClassroom(id).catch(() => [])),
    );
    const allIndicators = indicatorLists.flat();

    const studentIds = new Set<string>();
    for (const classroom of institutionClassrooms) {
      for (const enrollment of classroom.enrollments ?? []) {
        studentIds.add(enrollment.studentId);
      }
    }

    const riskCounts = await this.aggregateRisk(classroomIds);

    const summary = {
      institutionId,
      classroomCount: institutionClassrooms.length,
      studentCount: studentIds.size,
      avgAttendanceRate: average(allIndicators.map((i: any) => i.attendanceRate)),
      avgGrade: average(allIndicators.map((i: any) => i.avgGrade)),
      riskCounts,
      calculatedAt: new Date().toISOString(),
    };

    await this.redis.set(cacheKey, JSON.stringify(summary), INSTITUTION_SUMMARY_TTL_SECONDS);
    return summary;
  }

  async recordDailySnapshots(): Promise<void> {
    const national = await this.getNationalSummary(true);
    await this.prisma.metricSnapshot.createMany({
      data: [
        { scope: 'NATIONAL', metric: 'totalStudents', value: national.totalStudents },
        { scope: 'NATIONAL', metric: 'activeInstitutions', value: national.activeInstitutions },
      ],
    });

    const institutions = await this.classroomClient.getAllInstitutions();
    for (const institution of institutions) {
      try {
        const summary = await this.getInstitutionSummary(institution.id, true);
        await this.prisma.metricSnapshot.createMany({
          data: [
            { scope: 'INSTITUTION', scopeId: institution.id, metric: 'avgAttendanceRate', value: summary.avgAttendanceRate },
            { scope: 'INSTITUTION', scopeId: institution.id, metric: 'avgGrade', value: summary.avgGrade },
          ],
        });
      } catch (err) {
        this.logger.error(
          `No se pudo generar snapshot de la institución ${institution.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }

  async getTrends(scope: 'NATIONAL' | 'INSTITUTION', scopeId: string | undefined, metric: TrendMetric, months: number) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    return this.prisma.metricSnapshot.findMany({
      where: {
        scope,
        scopeId: scope === 'NATIONAL' ? null : scopeId,
        metric,
        capturedAt: { gte: since },
      },
      orderBy: { capturedAt: 'asc' },
    });
  }
}
