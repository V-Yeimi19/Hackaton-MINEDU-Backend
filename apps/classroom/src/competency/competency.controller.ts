import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { CompetencyService } from './competency.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { EvaluateCompetencyDto } from './dto/evaluate-competency.dto';

@Controller('competencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompetencyController {
  constructor(private readonly competencyService: CompetencyService) {}

  @Post()
  @Roles(Role.DOCENTE, Role.ADMIN)
  create(@Body() dto: CreateCompetencyDto) {
    return this.competencyService.create(dto);
  }

  @Get()
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findAll() {
    return this.competencyService.findAll();
  }

  @Get('student/:studentId')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findByStudent(@Param('studentId') studentId: string) {
    return this.competencyService.findByStudent(studentId);
  }

  @Get(':id')
  @Roles(Role.DOCENTE, Role.ADMIN, Role.DIRECTIVO)
  findOne(@Param('id') id: string) {
    return this.competencyService.findOne(id);
  }

  @Post('evaluate')
  @Roles(Role.DOCENTE, Role.ADMIN)
  evaluate(@Body() dto: EvaluateCompetencyDto) {
    return this.competencyService.evaluate(dto);
  }
}
