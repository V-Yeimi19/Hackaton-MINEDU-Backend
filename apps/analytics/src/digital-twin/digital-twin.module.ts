import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DigitalTwinController } from './digital-twin.controller';
import { DigitalTwinService } from './digital-twin.service';

@Module({
  imports: [HttpModule],
  controllers: [DigitalTwinController],
  providers: [DigitalTwinService],
})
export class DigitalTwinModule {}
