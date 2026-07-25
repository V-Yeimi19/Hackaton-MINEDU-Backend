import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EVENTS, RedisPubSubService, Role } from '@minedu/common';
import { UsersService } from '../users/users.service';

interface UserRoleChangedPayload {
  authUserId: string;
  role: Role;
}

@Injectable()
export class EventsSubscriberService implements OnModuleInit {
  private readonly logger = new Logger(EventsSubscriberService.name);

  constructor(
    private readonly redisPubSub: RedisPubSubService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.redisPubSub.subscribe<UserRoleChangedPayload>(EVENTS.USER_ROLE_CHANGED, async (payload) => {
      await this.usersService.updateRoleByAuthUserId(payload.authUserId, payload.role);
      this.logger.log(`Rol actualizado para authUserId=${payload.authUserId} -> ${payload.role}`);
    });
  }
}
