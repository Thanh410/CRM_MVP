import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DealsService } from './deals.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Deals')
@ApiBearerAuth('access-token')
@Controller('deals')
export class DealsController {
  constructor(private readonly svc: DealsService) {}

  @Post()
  @RequirePermissions('deals:create')
  create(@OrgId() orgId: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.create(orgId, dto, actor);
  }

  @Get()
  @RequirePermissions('deals:read')
  findAll(@OrgId() orgId: string, @Query() query: PaginationDto) {
    return this.svc.findAll(orgId, query);
  }

  @Get('kanban')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Get deals grouped by stage for kanban' })
  getKanban(@OrgId() orgId: string, @Query('pipelineId') pipelineId?: string) {
    return this.svc.getKanban(orgId, pipelineId);
  }

  @Get('pipelines')
  @RequirePermissions('deals:read')
  @ApiOperation({ summary: 'Get pipelines with stages' })
  getPipelines(@OrgId() orgId: string) {
    return this.svc.getPipelines(orgId);
  }

  @Get(':id')
  @RequirePermissions('deals:read')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions('deals:update')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.update(orgId, id, dto, actor);
  }

  @Patch(':id/stage')
  @RequirePermissions('deals:update')
  @ApiOperation({ summary: 'Move deal to different stage' })
  moveStage(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { stageId: string },
    @CurrentUser('id') actor: string,
  ) {
    return this.svc.moveStage(orgId, id, body.stageId, actor);
  }

  @Patch(':id/won')
  @RequirePermissions('deals:update')
  @ApiOperation({ summary: 'Mark deal as won' })
  markWon(@OrgId() orgId: string, @Param('id') id: string, @CurrentUser('id') actor: string) {
    return this.svc.markWon(orgId, id, actor);
  }

  @Patch(':id/lost')
  @RequirePermissions('deals:update')
  @ApiOperation({ summary: 'Mark deal as lost' })
  markLost(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { lostReason?: string },
    @CurrentUser('id') actor: string,
  ) {
    return this.svc.markLost(orgId, id, body.lostReason, actor);
  }

  @Delete(':id')
  @RequirePermissions('deals:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@OrgId() orgId: string, @Param('id') id: string, @CurrentUser('id') actor: string) {
    return this.svc.remove(orgId, id, actor);
  }
}
