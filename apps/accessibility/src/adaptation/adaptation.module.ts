import { Module } from '@nestjs/common';
import { AdaptationService } from './adaptation.service';

@Module({
  providers: [AdaptationService],
  exports: [AdaptationService],
})
export class AdaptationModule {}
