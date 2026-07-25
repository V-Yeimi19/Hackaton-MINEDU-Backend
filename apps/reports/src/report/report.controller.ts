import { Controller, Get, Post, Param, Body, Query, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles, Role, CurrentUser, JwtPayload } from '@minedu/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import {
  GenerateInstitutionReportDto,
  GenerateClassroomReportDto,
  GenerateStudentReportDto,
  ReportFilterDto,
} from './dto/report.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('generate')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  generate(@Body() dto: GenerateInstitutionReportDto, @CurrentUser() user: JwtPayload) {
    return this.reportService.generateReport(dto, user.sub);
  }

  @Post('generate/pdf')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  async generatePdf(@Body() dto: GenerateInstitutionReportDto, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const result = await this.reportService.generateReport(dto, user.sub);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-institucional-${result.report.id}.pdf"`,
    });
    res.send(result.pdfBuffer);
  }

  @Post('generate/classroom')
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  async generateClassroomPdf(@Body() dto: GenerateClassroomReportDto, @Res() res: Response) {
    const pdfBuffer = await this.reportService.generateClassroomReport(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-aula-${dto.classroomId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Post('generate/student')
  @Roles(Role.ADMIN, Role.DIRECTIVO, Role.DOCENTE)
  async generateStudentPdf(@Body() dto: GenerateStudentReportDto, @Res() res: Response) {
    const pdfBuffer = await this.reportService.generateStudentReport(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="reporte-estudiante-${dto.studentId}.pdf"`,
    });
    res.send(pdfBuffer);
  }

  @Get()
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  findAll(@Query() filter: ReportFilterDto) {
    return this.reportService.findAll(filter);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @Get(':id/download')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  async download(@Param('id') id: string, @Res() res: Response) {
    const url = await this.reportService.getDownloadUrl(id);
    res.redirect(url);
  }

  @Get(':id/download/pdf')
  @Roles(Role.ADMIN, Role.DIRECTIVO)
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const url = await this.reportService.getPdfDownloadUrl(id);
    res.redirect(url);
  }
}
