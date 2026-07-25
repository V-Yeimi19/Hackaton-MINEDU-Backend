import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassroomTwinResponse, StudentTwinSnapshot } from './dto/digital-twin-response.dto';

@Injectable()
export class DigitalTwinService {
  constructor(private prisma: PrismaService) {}

  async getClassroomTwin(classroomId: string): Promise<ClassroomTwinResponse> {
    const indicators = await this.prisma.studentIndicator.findMany({
      where: { classroomId },
    });

    if (indicators.length === 0) {
      throw new NotFoundException(
        `No hay indicadores registrados para el aula ${classroomId}`,
      );
    }

    const studentIds = indicators.map((i) => i.studentId);

    const riskAssessments = await this.prisma.riskAssessment.findMany({
      where: { classroomId, studentId: { in: studentIds } },
      orderBy: { detectedAt: 'desc' },
    });
    const latestRiskByStudent = new Map<string, (typeof riskAssessments)[number]>();
    for (const r of riskAssessments) {
      if (!latestRiskByStudent.has(r.studentId)) {
        latestRiskByStudent.set(r.studentId, r);
      }
    }

    const recommendations = await this.prisma.recommendation.findMany({
      where: {
        classroomId,
        studentId: { in: studentIds },
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
    const recsByStudent = new Map<string, typeof recommendations>();
    for (const rec of recommendations) {
      const list = recsByStudent.get(rec.studentId) ?? [];
      list.push(rec);
      recsByStudent.set(rec.studentId, list);
    }

    const students: StudentTwinSnapshot[] = indicators.map((indicator) => {
      const risk = latestRiskByStudent.get(indicator.studentId);
      return {
        studentId: indicator.studentId,
        attendanceRate: indicator.attendanceRate,
        avgGrade: indicator.avgGrade,
        participationScore: indicator.participationScore,
        competencyScore: indicator.competencyScore,
        riskLevel: risk?.level ?? 'NONE',
        riskReasons: risk?.reasons ?? [],
        recommendations: (recsByStudent.get(indicator.studentId) ?? []).map((r) => ({
          id: r.id,
          type: r.type,
          message: r.message,
          source: r.source,
          status: r.status,
        })),
        lastUpdated: indicator.updatedAt,
      };
    });

    return {
      classroomId,
      studentsCount: students.length,
      atRiskCount: students.filter((s) => s.riskLevel !== 'NONE').length,
      students,
    };
  }

  async getStudentTwin(studentId: string, classroomId: string): Promise<StudentTwinSnapshot> {
    const twin = await this.getClassroomTwin(classroomId);
    const student = twin.students.find((s) => s.studentId === studentId);
    if (!student) {
      throw new NotFoundException(`Estudiante ${studentId} no encontrado en aula ${classroomId}`);
    }
    return student;
  }
}
