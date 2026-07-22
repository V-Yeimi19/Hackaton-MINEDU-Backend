import { Module } from '@nestjs/common';
import { RiskService } from './risk.service';
import { RecommendationModule } from '../recommendation/recommendation.module';

@Module({
  imports: [RecommendationModule],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
