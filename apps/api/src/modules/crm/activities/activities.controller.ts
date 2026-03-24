import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EntityType } from '@prisma/client';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiQuery({ name: 'entityType', enum: EntityType, required: false })
  @ApiQuery({ name: 'entityId', required: false })
  findAll(
    @OrgId() orgId: string,
    @Query('entityType') entityType?: EntityType,
    @Query('entityId') entityId?: string,
  ) {
    return this.activitiesService.findAll(orgId, entityType, entityId);
  }

  @Post()
  create(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.activitiesService.create(orgId, userId, dto);
  }

  @Delete(':id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.activitiesService.remove(orgId, id);
  }
}
