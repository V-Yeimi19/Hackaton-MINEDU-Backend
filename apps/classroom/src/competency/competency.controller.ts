import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { CompetencyService } from './competency.service';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { EvaluateCompetencyDto } from './dto/evaluate-competency.dto';

@Controller('competencies')
export class CompetencyController {
  constructor(private readonly competencyService: CompetencyService) {}

  @Post()
  create(@Body() dto: CreateCompetencyDto) {
    return this.competencyService.create(dto);
  }

  @Get()
  findAll() {
    return this.competencyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.competencyService.findOne(id);
  }

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateCompetencyDto) {
    return this.competencyService.evaluate(dto);
  }

  @Get('student/:studentId')
  findByStudent(@Param('studentId') studentId: string) {
    return this.competencyService.findByStudent(studentId);
  }
}
