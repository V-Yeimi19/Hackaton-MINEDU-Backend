import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsSubscriberService } from './events-subscriber.service';

@Module({
  imports: [NotificationsModule],
  providers: [EventsSubscriberService],
})
export class EventsModule {}
