import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PipelineService } from './pipeline.service';
import { OcrModule } from '../ocr/ocr.module';
import { AdaptationModule } from '../adaptation/adaptation.module';
import { AudioModule } from '../audio/audio.module';
import { PictogramModule } from './pictogram.module';

@Module({
  imports: [HttpModule, OcrModule, AdaptationModule, AudioModule, PictogramModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
