import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { InternalKeyGuard } from '@minedu/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('internal')
@UseGuards(InternalKeyGuard)
export class InternalController {
  constructor(private prisma: PrismaService) {}

  @Get('indicators/classroom/:classroomId')
  getIndicatorsByClassroom(@Param('classroomId') classroomId: string) {
    return this.prisma.studentIndicator.findMany({
      where: { classroomId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get('risk/classroom/:classroomId')
  getRiskByClassroom(@Param('classroomId') classroomId: string) {
    return this.prisma.riskAssessment.findMany({
      where: { classroomId },
      orderBy: { detectedAt: 'desc' },
    });
  }

  @Get('recommendations/classroom/:classroomId')
  getRecommendationsByClassroom(@Param('classroomId') classroomId: string) {
    return this.prisma.recommendation.findMany({
      where: { classroomId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
