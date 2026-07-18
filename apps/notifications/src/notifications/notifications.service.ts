import { InjectQueue } from '@nestjs/bullmq';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notifications') private readonly queue: Queue,
  ) {}

  async enqueue(dto: CreateNotificationDto): Promise<void> {
    await this.queue.add('deliver', dto);
  }

  async findAllForUser(userId: string, query: ListNotificationsQueryDto) {
    const where = { userId };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }
}
