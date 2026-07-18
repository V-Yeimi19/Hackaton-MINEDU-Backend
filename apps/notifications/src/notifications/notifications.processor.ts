import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {
    super();
  }

  async process(job: Job<CreateNotificationDto>): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: job.data.userId,
        type: job.data.type,
        title: job.data.title,
        message: job.data.message,
        payload: job.data.payload as Prisma.InputJsonValue | undefined,
      },
    });
    this.gateway.pushToUser(job.data.userId, notification);
    this.logger.log(`Notificación entregada a ${job.data.userId} (${job.data.type})`);
  }
}
