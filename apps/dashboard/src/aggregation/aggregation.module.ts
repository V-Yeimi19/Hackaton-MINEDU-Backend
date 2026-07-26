import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { AggregationController } from './aggregation.controller';
import { AggregationService } from './aggregation.service';

@Module({
  imports: [ClientsModule],
  controllers: [AggregationController],
  providers: [AggregationService],
  exports: [AggregationService],
})
export class AggregationModule {}
