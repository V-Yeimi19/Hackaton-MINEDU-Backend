import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ClassroomClientService } from './classroom-client.service';
import { AnalyticsClientService } from './analytics-client.service';

@Module({
  imports: [HttpModule],
  providers: [ClassroomClientService, AnalyticsClientService],
  exports: [ClassroomClientService, AnalyticsClientService],
})
export class ClientsModule {}
