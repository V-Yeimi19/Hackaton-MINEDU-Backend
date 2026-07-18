import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENTS, RedisPubSubService } from '@minedu/common';
import { NotificationsService } from '../notifications/notifications.service';

interface UserCreatedPayload {
  authUserId: string;
  email: string;
  fullName: string;
  role: string;
}

@Injectable()
export class EventsSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(EventsSubscriberService.name);

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.redisPubSub.subscribe<UserCreatedPayload>(EVENTS.USER_CREATED, async (payload) => {
      await this.notificationsService.enqueue({
        userId: payload.authUserId,
        type: 'welcome',
        title: 'Bienvenido a la plataforma MINEDU',
        message: `Hola ${payload.fullName}, tu cuenta fue creada correctamente.`,
      });
      this.logger.log(`Notificación de bienvenida encolada para ${payload.email}`);
    });
  }
}
