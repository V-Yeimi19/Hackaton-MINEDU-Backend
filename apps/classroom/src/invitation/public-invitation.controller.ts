import { Controller, Get, Param } from '@nestjs/common';
import { InvitationService } from './invitation.service';

@Controller('invitations')
export class PublicInvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get('token/:token')
  findByToken(@Param('token') token: string) {
    return this.invitationService.findByToken(token);
  }
}
