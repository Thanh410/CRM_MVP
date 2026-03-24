import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { EntityType } from '@prisma/client';

@ApiTags('tags')
@ApiBearerAuth()
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  findAll(@OrgId() orgId: string) {
    return this.tagsService.findAll(orgId);
  }

  @Post()
  create(@OrgId() orgId: string, @Body() dto: { name: string; color?: string }) {
    return this.tagsService.create(orgId, dto);
  }

  @Delete(':id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.tagsService.remove(orgId, id);
  }

  @Post(':id/entities')
  addToEntity(
    @OrgId() orgId: string,
    @Param('id') tagId: string,
    @Body('entityType') entityType: EntityType,
    @Body('entityId') entityId: string,
  ) {
    return this.tagsService.addToEntity(orgId, tagId, entityType, entityId);
  }

  @Delete(':id/entities/:entityType/:entityId')
  removeFromEntity(
    @Param('id') tagId: string,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.tagsService.removeFromEntity(tagId, entityType, entityId);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @OrgId() orgId: string,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
  ) {
    return this.tagsService.findByEntity(orgId, entityType, entityId);
  }
}
