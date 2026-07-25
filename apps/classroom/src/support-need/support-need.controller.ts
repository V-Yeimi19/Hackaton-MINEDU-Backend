import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, JwtPayload, Role, Roles, RolesGuard } from '@minedu/common';
import { SupportNeedService } from './support-need.service';
import { CreateSupportNeedDto } from './dto/create-support-need.dto';
import { UpdateSupportNeedDto } from './dto/update-support-need.dto';

@Controller('support-needs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SupportNeedController {
  constructor(private readonly supportNeedService: SupportNeedService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ESPECIALISTA, Role.ADMIN)
  create(@Body() dto: CreateSupportNeedDto, @CurrentUser() currentUser: JwtPayload) {
    return this.supportNeedService.create(dto, currentUser.sub);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ESPECIALISTA, Role.ADMIN, Role.DIRECTIVO)
  findByStudent(@Param('studentId') studentId: string) {
    return this.supportNeedService.findByStudent(studentId);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ESPECIALISTA, Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSupportNeedDto) {
    return this.supportNeedService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ESPECIALISTA, Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.supportNeedService.remove(id);
  }
}
