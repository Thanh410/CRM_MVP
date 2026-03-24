import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotesService } from './notes.service';
import { EntityType } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';

@ApiTags('Notes')
@ApiBearerAuth('access-token')
@Controller('notes')
export class NotesController {
  constructor(private readonly svc: NotesService) {}

  @Post()
  @ApiOperation({ summary: 'Create note for any entity' })
  create(
    @OrgId() orgId: string,
    @Body() body: { entityType: EntityType; entityId: string; content: string; isPinned?: boolean },
    @CurrentUser('id') actor: string,
  ) {
    return this.svc.create(orgId, body, actor);
  }

  @Get()
  @ApiOperation({ summary: 'Get notes for entity' })
  findByEntity(
    @OrgId() orgId: string,
    @Query('entityType') entityType: EntityType,
    @Query('entityId') entityId: string,
  ) {
    return this.svc.findByEntity(orgId, entityType, entityId);
  }

  @Patch(':id')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.update(orgId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.remove(orgId, id);
  }
}
