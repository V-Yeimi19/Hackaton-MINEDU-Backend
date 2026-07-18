import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser, InternalKeyGuard, JwtAuthGuard, JwtPayload } from '@minedu/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationsService } from './notifications.service';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(InternalKeyGuard)
  @Post('internal')
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.enqueue(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findMine(@Query() query: ListNotificationsQueryDto, @CurrentUser() currentUser: JwtPayload) {
    return this.notificationsService.findAllForUser(currentUser.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() currentUser: JwtPayload) {
    return this.notificationsService.markRead(id, currentUser.sub);
  }
}
