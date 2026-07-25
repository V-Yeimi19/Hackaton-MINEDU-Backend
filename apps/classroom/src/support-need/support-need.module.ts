import { Module } from '@nestjs/common';
import { SupportNeedService } from './support-need.service';
import { SupportNeedController } from './support-need.controller';

@Module({
  controllers: [SupportNeedController],
  providers: [SupportNeedService],
})
export class SupportNeedModule {}
