import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser, JwtAuthGuard, JwtPayload, Role } from '@minedu/common';
import type { Response } from 'express';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { FilesService } from './files.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentUser() currentUser: JwtPayload) {
    return this.filesService.upload(file, currentUser.sub);
  }

  @Get()
  findAll(@Query() query: ListFilesQueryDto, @CurrentUser() currentUser: JwtPayload) {
    return this.filesService.findAllByOwner(currentUser.sub, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    const file = await this.filesService.findOne(id);
    this.assertSelfOrPrivileged(currentUser, file.ownerId);
    return file;
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtPayload,
    @Res() res: Response,
  ) {
    const file = await this.filesService.findOne(id);
    this.assertSelfOrPrivileged(currentUser, file.ownerId);
    const url = await this.filesService.getDownloadUrl(id);
    res.redirect(url);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    const file = await this.filesService.findOne(id);
    this.assertSelfOrPrivileged(currentUser, file.ownerId);
    await this.filesService.remove(id);
  }

  private assertSelfOrPrivileged(currentUser: JwtPayload, ownerId: string): void {
    const isSelf = currentUser.sub === ownerId;
    const isPrivileged = currentUser.role === Role.ADMIN || currentUser.role === Role.DIRECTIVO;
    if (!isSelf && !isPrivileged) {
      throw new ForbiddenException('No tienes permiso para acceder a este recurso');
    }
  }
}
