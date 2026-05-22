import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BulkDeleteDto } from '../../common/dto/bulk-delete.dto';
import { QueryProjectDto } from './dto/query-project.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@OrgId() orgId: string, @Query() query: QueryProjectDto) {
    return this.projectsService.findAll(orgId, query);
  }

  @Post('bulk-delete')
  bulkDelete(@OrgId() orgId: string, @Body() dto: BulkDeleteDto) {
    return this.projectsService.bulkRemove(orgId, dto.ids);
  }

  @Get(':id')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.projectsService.findOne(orgId, id);
  }

  @Post()
  create(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(orgId, userId, dto);
  }

  @Patch(':id')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any) {
    return this.projectsService.update(orgId, id, dto);
  }

  @Delete(':id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.projectsService.remove(orgId, id);
  }
}
