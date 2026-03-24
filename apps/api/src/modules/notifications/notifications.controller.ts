import { Controller, Get, Patch, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findAll(orgId, userId, unreadOnly === 'true');
  }

  @Patch(':id/read')
  markRead(@OrgId() orgId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(orgId, id);
  }

  @Patch('read-all')
  markAllRead(@OrgId() orgId: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(orgId, userId);
  }

  @Delete(':id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.notificationsService.remove(orgId, id);
  }
}
