import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';

@Module({
  imports: [HttpModule],
  controllers: [InvitationController],
  providers: [InvitationService],
  exports: [InvitationService],
})
export class InvitationModule {}
