import { Controller, Get, Post, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, CurrentUser, JwtPayload } from '@minedu/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import { GenerateInstitutionReportDto, ReportFilterDto } from './dto/report.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.DIRECTIVO)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  generate(@Body() dto: GenerateInstitutionReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportService.generateReport(dto, user.sub);
  }

  @Get()
  findAll(@Query() filter: ReportFilterDto) {
    return this.reportService.findAll(filter);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const url = await this.reportService.getDownloadUrl(id);
    res.redirect(url);
  }
}
