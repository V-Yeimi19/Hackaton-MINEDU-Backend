import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    private prisma: PrismaService,
    private pubsub: RedisPubSubService,
  ) {}

  async create(dto: CreateStudentDto, familiarId: string) {
    const student = await this.prisma.student.create({
      data: {
        fullName: dto.fullName,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        familiarId,
        supportNeeds: dto.supportNeeds
          ? {
              create: dto.supportNeeds.map((sn) => ({
                type: sn.type,
                level: sn.level ?? 'MODERADO',
                description: sn.description,
                registeredBy: familiarId,
              })),
            }
          : undefined,
      },
      include: { supportNeeds: true },
    });

    try {
      await this.pubsub.publish(EVENTS.STUDENT_CREATED, {
        studentId: student.id,
        familiarId,
        fullName: student.fullName,
      });
    } catch (err) {
      this.logger.warn('Fallo publicando evento STUDENT_CREATED', err);
    }

    return student;
  }

  async findAllByFamiliar(familiarId: string) {
    return this.prisma.student.findMany({
      where: { familiarId },
      include: { supportNeeds: true },
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { supportNeeds: true },
    });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    if (userRole === 'FAMILIAR' && student.familiarId !== userId) {
      throw new ForbiddenException('No tienes acceso a este estudiante');
    }
    return student;
  }

  async update(id: string, dto: UpdateStudentDto, userId: string, userRole: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    if (userRole === 'FAMILIAR' && student.familiarId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este estudiante');
    }
    return this.prisma.student.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }
    if (userRole === 'FAMILIAR' && student.familiarId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este estudiante');
    }
    await this.prisma.student.delete({ where: { id } });
  }
}
