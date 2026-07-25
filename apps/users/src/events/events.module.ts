import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { EventsSubscriberService } from './events-subscriber.service';

@Module({
  imports: [UsersModule],
  providers: [EventsSubscriberService],
})
export class EventsModule {}
