import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListFilesQueryDto } from './dto/list-files-query.dto';

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  async upload(file: Express.Multer.File, ownerId: string) {
    const key = `${randomUUID()}${extname(file.originalname)}`;
    await this.minio.putObject(key, file.buffer, file.mimetype);
    return this.prisma.fileObject.create({
      data: {
        key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        ownerId,
      },
    });
  }

  async uploadBuffer(buffer: Buffer, originalName: string, mimeType: string) {
    const key = `${randomUUID()}${extname(originalName)}`;
    await this.minio.putObject(key, buffer, mimeType);
    return this.prisma.fileObject.create({
      data: {
        key,
        originalName,
        mimeType,
        size: buffer.length,
        ownerId: 'internal',
      },
    });
  }

  async findAllByOwner(ownerId: string, query: ListFilesQueryDto) {
    const where = { ownerId };
    const [items, total] = await Promise.all([
      this.prisma.fileObject.findMany({ where, skip: query.skip, take: query.limit }),
      this.prisma.fileObject.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async findOne(id: string) {
    const file = await this.prisma.fileObject.findUnique({ where: { id } });
    if (!file) {
      throw new NotFoundException('Archivo no encontrado');
    }
    return file;
  }

  async getDownloadUrl(id: string): Promise<string> {
    const file = await this.findOne(id);
    return this.minio.presignedDownloadUrl(file.key);
  }

  async remove(id: string): Promise<void> {
    const file = await this.findOne(id);
    await this.minio.removeObject(file.key);
    await this.prisma.fileObject.delete({ where: { id } });
  }
}
