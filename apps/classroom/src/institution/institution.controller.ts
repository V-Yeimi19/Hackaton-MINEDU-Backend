import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  @Roles(Role.DIRECTIVO)
  create(@Body() dto: CreateInstitutionDto, @CurrentUser() user: JwtPayload) {
    return this.institutionService.create(dto, user.sub);
  }

  @Get()
  @Roles(Role.DIRECTIVO, Role.ADMIN)
  findAll(@CurrentUser() user: JwtPayload) {
    if (user.role === Role.ADMIN) {
      return this.institutionService.findAll();
    }
    return this.institutionService.findAllByDirector(user.sub);
  }

  @Get(':id')
  @Roles(Role.DIRECTIVO, Role.ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.institutionService.findOne(id, user.sub, user.role === Role.ADMIN);
  }

  @Patch(':id')
  @Roles(Role.DIRECTIVO, Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstitutionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.institutionService.update(id, dto, user.sub, user.role === Role.ADMIN);
  }

  @Delete(':id')
  @Roles(Role.DIRECTIVO, Role.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.institutionService.remove(id, user.sub, user.role === Role.ADMIN);
  }
}
