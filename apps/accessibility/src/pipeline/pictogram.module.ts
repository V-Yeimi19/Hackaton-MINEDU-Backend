import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PictogramService } from './pictogram.service';

@Module({
  imports: [HttpModule],
  providers: [PictogramService],
  exports: [PictogramService],
})
export class PictogramModule {}
