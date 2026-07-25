import { Controller, Post, Get, Param, Body, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { PipelineService } from './pipeline/pipeline.service';
import { ProcessContentDto, GenerateWorksheetDto } from './pipeline/dto/pipeline.dto';
import { Response } from 'express';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccessibilityController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Post('process')
  @Roles(Role.ADMIN, Role.DOCENTE, Role.ESPECIALISTA)
  async process(@Body() dto: ProcessContentDto) {
    const result = await this.pipelineService.process(dto);
    return {
      job: result.job,
      audioSize: result.audioBuffer.length,
    };
  }

  @Post('process/audio')
  @Roles(Role.ADMIN, Role.DOCENTE, Role.ESPECIALISTA)
  async processAndReturnAudio(@Body() dto: ProcessContentDto, @Res() res: Response) {
    const result = await this.pipelineService.process(dto);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Disposition': `attachment; filename="audio-${result.job?.id}.mp3"`,
    });
    res.send(result.audioBuffer);
  }

  @Post('process/worksheet')
  @Roles(Role.ADMIN, Role.DOCENTE, Role.ESPECIALISTA)
  async processWorksheet(@Body() dto: GenerateWorksheetDto) {
    const result = await this.pipelineService.processWorksheet(dto);
    return {
      job: result.job,
      worksheetSize: result.worksheetPdf.length,
    };
  }

  @Get('jobs')
  @Roles(Role.ADMIN, Role.DOCENTE, Role.ESPECIALISTA, Role.DIRECTIVO)
  findAll() {
    return this.pipelineService.findAll();
  }

  @Get('jobs/:id')
  @Roles(Role.ADMIN, Role.DOCENTE, Role.ESPECIALISTA, Role.DIRECTIVO)
  findOne(@Param('id') id: string) {
    return this.pipelineService.findOne(id);
  }
}
