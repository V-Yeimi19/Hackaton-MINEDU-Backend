import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [ClientsModule],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
