import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionService {
  private readonly logger = new Logger(InstitutionService.name);

  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInstitutionDto, directorId: string) {
    return this.prisma.institution.create({
      data: {
        name: dto.name,
        code: dto.code,
        address: dto.address,
        directorId,
      },
    });
  }

  async findAll() {
    return this.prisma.institution.findMany({
      include: { classrooms: true, teachers: true },
    });
  }

  async findAllByDirector(directorId: string) {
    return this.prisma.institution.findMany({
      where: { directorId },
      include: { classrooms: true, teachers: true },
    });
  }

  async findOne(id: string, userId: string, isAdmin: boolean) {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
      include: {
        classrooms: { include: { courses: true } },
        teachers: true,
      },
    });
    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }
    if (!isAdmin && institution.directorId !== userId) {
      throw new ForbiddenException('No tienes acceso a esta institución');
    }
    return institution;
  }

  async update(id: string, dto: UpdateInstitutionDto, userId: string, isAdmin: boolean) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }
    if (!isAdmin && institution.directorId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar esta institución');
    }
    return this.prisma.institution.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const institution = await this.prisma.institution.findUnique({ where: { id } });
    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }
    if (!isAdmin && institution.directorId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar esta institución');
    }
    await this.prisma.institution.delete({ where: { id } });
  }
}
