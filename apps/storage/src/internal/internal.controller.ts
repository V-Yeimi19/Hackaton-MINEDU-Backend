import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '@minedu/common';
import { FilesService } from '../files/files.service';

@Controller('internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  async uploadBuffer(
    @Body() body: { buffer: string; originalName: string; mimeType: string },
  ) {
    const buf = Buffer.from(body.buffer, 'base64');
    return this.filesService.uploadBuffer(buf, body.originalName, body.mimeType);
  }

  @Get(':id')
  async getFile(@Param('id') id: string) {
    return this.filesService.findOne(id);
  }

  @Get(':id/download-url')
  async getDownloadUrl(@Param('id') id: string) {
    const url = await this.filesService.getDownloadUrl(id);
    return { url };
  }
}
