import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportNeedDto } from './dto/create-support-need.dto';
import { UpdateSupportNeedDto } from './dto/update-support-need.dto';

@Injectable()
export class SupportNeedService {
  constructor(private prisma: PrismaService) {}

  private async assertOwnership(studentId: string, userId: string, userRole: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    if (userRole === Role.FAMILIAR) {
      if (student.familiarId !== userId) {
        throw new ForbiddenException('No tienes permiso para modificar las necesidades de este estudiante');
      }
      return;
    }
    if (userRole === Role.DOCENTE) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, classroom: { teacherId: userId } },
      });
      if (!enrollment) {
        throw new ForbiddenException('No tienes permiso para modificar las necesidades de este estudiante');
      }
      return;
    }
  }

  async create(dto: CreateSupportNeedDto, registeredBy: string, userRole: string) {
    await this.assertOwnership(dto.studentId, registeredBy, userRole);
    return this.prisma.studentSupportNeed.create({
      data: {
        studentId: dto.studentId,
        type: dto.type,
        level: dto.level,
        description: dto.description,
        registeredBy,
      },
    });
  }

  async findByStudent(studentId: string, userId?: string, userRole?: string) {
    if (userRole === Role.FAMILIAR && userId) {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, familiarId: userId },
      });
      if (!enrollment) {
        throw new ForbiddenException('No tienes acceso a este estudiante');
      }
    }
    return this.prisma.studentSupportNeed.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async findOne(id: string) {
    const supportNeed = await this.prisma.studentSupportNeed.findUnique({ where: { id } });
    if (!supportNeed) {
      throw new NotFoundException('Necesidad de apoyo no encontrada');
    }
    return supportNeed;
  }

  async update(id: string, dto: UpdateSupportNeedDto, userId: string, userRole: string) {
    const supportNeed = await this.findOne(id);
    await this.assertOwnership(supportNeed.studentId, userId, userRole);
    return this.prisma.studentSupportNeed.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const supportNeed = await this.findOne(id);
    await this.assertOwnership(supportNeed.studentId, userId, userRole);
    await this.prisma.studentSupportNeed.delete({ where: { id } });
  }
}
