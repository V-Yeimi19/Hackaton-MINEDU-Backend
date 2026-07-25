import { Controller, Post, Get, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role } from '@minedu/common';
import { ReportService } from './report.service';
import { GenerateReportDto, ReportFilterDto } from './dto/report.dto';
import { Response } from 'express';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  async generate(@Body() dto: GenerateReportDto) {
    const result = await this.reportService.generateReport(dto);
    return {
      report: result.report,
      attendanceSummary: result.attendanceSummary,
      gradeSummary: result.gradeSummary,
      anomalies: result.anomalies,
    };
  }

  @Post('generate/pdf')
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  async generatePdf(@Body() dto: GenerateReportDto, @Res() res: Response) {
    const result = await this.reportService.generateReport(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-${result.report.id}.pdf"`,
    });
    res.send(result.pdfBuffer);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  findAll(@Query() filter: ReportFilterDto) {
    return this.reportService.findAll(filter);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }
}
