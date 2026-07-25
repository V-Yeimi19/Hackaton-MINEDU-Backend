import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
  imports: [HttpModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
