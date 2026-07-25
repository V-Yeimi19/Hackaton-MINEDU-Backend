import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { PublicInvitationController } from './public-invitation.controller';

@Module({
  controllers: [InvitationController, PublicInvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
