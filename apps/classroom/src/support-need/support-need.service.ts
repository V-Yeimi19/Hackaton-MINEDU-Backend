import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportNeedDto } from './dto/create-support-need.dto';
import { UpdateSupportNeedDto } from './dto/update-support-need.dto';

@Injectable()
export class SupportNeedService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupportNeedDto, registeredBy: string) {
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

  async findByStudent(studentId: string) {
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

  async update(id: string, dto: UpdateSupportNeedDto) {
    await this.findOne(id);
    return this.prisma.studentSupportNeed.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.studentSupportNeed.delete({ where: { id } });
  }
}
