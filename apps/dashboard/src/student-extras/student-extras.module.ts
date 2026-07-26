import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module';
import { StudentExtrasController } from './student-extras.controller';
import { StudentExtrasService } from './student-extras.service';

@Module({
  imports: [ClientsModule],
  controllers: [StudentExtrasController],
  providers: [StudentExtrasService],
})
export class StudentExtrasModule {}
