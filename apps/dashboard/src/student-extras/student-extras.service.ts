import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClassroomClientService } from '../clients/classroom-client.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

const LOGRADO_LEVEL = 'LOGRADO';

@Injectable()
export class StudentExtrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly classroomClient: ClassroomClientService,
  ) {}

  private async ensureFamiliarAccess(studentId: string, familiarId: string): Promise<void> {
    const students = await this.classroomClient.getStudentsByFamiliar(familiarId);
    if (!students.some((s: any) => s.id === studentId)) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }
  }

  async getExtras(studentId: string, userId?: string, userRole?: Role) {
    if (userRole === Role.FAMILIAR && userId) {
      await this.ensureFamiliarAccess(studentId, userId);
    }

    const [competencies, incidents] = await Promise.all([
      this.classroomClient.getCompetenciesByStudent(studentId),
      this.prisma.studentIncident.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // "Créditos" se define aquí como el número de competencias alcanzadas
    // (level = LOGRADO) — no existe este concepto en Classroom, se deriva.
    const creditsEarned = competencies.filter((c: any) => c.level === LOGRADO_LEVEL).length;

    return { studentId, creditsEarned, incidents };
  }

  async createIncident(studentId: string, dto: CreateIncidentDto, registeredBy: string) {
    return this.prisma.studentIncident.create({
      data: {
        studentId,
        type: dto.type,
        description: dto.description,
        severity: dto.severity ?? 'LEVE',
        registeredBy,
      },
    });
  }
}
