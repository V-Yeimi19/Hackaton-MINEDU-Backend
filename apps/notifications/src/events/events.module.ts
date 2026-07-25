import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';
import { EventsSubscriberService } from './events-subscriber.service';

@Module({
  imports: [NotificationsModule, EmailModule],
  providers: [EventsSubscriberService],
})
export class EventsModule {}
