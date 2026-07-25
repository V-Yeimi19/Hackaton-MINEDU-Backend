import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, JwtPayload, RolesGuard, Roles, CurrentUser, Role } from '@minedu/common';
import { InvitationService } from './invitation.service';
import { CreateTeacherInvitationDto } from './dto/create-teacher-invitation.dto';
import { CreateFamilyInvitationDto } from './dto/create-family-invitation.dto';
import { AcceptTeacherInvitationDto, AcceptFamilyInvitationDto } from './dto/accept-invitation.dto';

@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('teacher')
  @Roles(Role.DIRECTIVO)
  createTeacherInvitation(
    @Body() dto: CreateTeacherInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.createTeacherInvitation(dto, user.sub);
  }

  @Post('family')
  @Roles(Role.DOCENTE)
  createFamilyInvitation(
    @Body() dto: CreateFamilyInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.createFamilyInvitation(dto, user.sub);
  }

  @Post('accept/teacher')
  @Roles(Role.DOCENTE)
  acceptTeacherInvitation(
    @Body() dto: AcceptTeacherInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.acceptTeacherInvitation(dto, user.sub);
  }

  @Post('accept/family')
  @Roles(Role.FAMILIAR)
  acceptFamilyInvitation(
    @Body() dto: AcceptFamilyInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.acceptFamilyInvitation(dto, user.sub);
  }

  @Get('pending/institution/:institutionId')
  @Roles(Role.DIRECTIVO)
  findPendingByInstitution(
    @Param('institutionId') institutionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.findPendingByInstitution(institutionId, user.sub);
  }

  @Get('pending/classroom/:classroomId')
  @Roles(Role.DOCENTE)
  findPendingByClassroom(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.invitationService.findPendingByClassroom(classroomId, user.sub);
  }

  @Patch(':id/revoke')
  revoke(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.invitationService.revoke(id, user.sub);
  }
}
