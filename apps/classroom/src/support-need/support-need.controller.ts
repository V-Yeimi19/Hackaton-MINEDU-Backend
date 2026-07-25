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
  @Roles(Role.DOCENTE, Role.ADMIN, Role.FAMILIAR)
  create(@Body() dto: CreateSupportNeedDto, @CurrentUser() currentUser: JwtPayload) {
    return this.supportNeedService.create(dto, currentUser.sub, currentUser.role);
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO, Role.FAMILIAR)
  findByStudent(@Param('studentId') studentId: string, @CurrentUser() user: JwtPayload) {
    return this.supportNeedService.findByStudent(studentId, user.sub, user.role);
  }

  @Patch(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.FAMILIAR)
  update(@Param('id') id: string, @Body() dto: UpdateSupportNeedDto, @CurrentUser() user: JwtPayload) {
    return this.supportNeedService.update(id, dto, user.sub, user.role);
  }

  @Delete(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.FAMILIAR)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.supportNeedService.remove(id, user.sub, user.role);
  }
}
