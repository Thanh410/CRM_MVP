import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TaskStatus } from '@prisma/client';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Query() query: QueryTaskDto) {
    return this.tasksService.findAll(orgId, userId, query);
  }

  @Get('kanban')
  @ApiQuery({ name: 'projectId', required: false })
  getKanban(@OrgId() orgId: string, @Query('projectId') projectId?: string) {
    return this.tasksService.getKanban(orgId, projectId);
  }

  @Get(':id')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.tasksService.findOne(orgId, id);
  }

  @Post()
  create(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(orgId, userId, dto);
  }

  @Patch(':id')
  update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: Partial<CreateTaskDto>,
  ) {
    return this.tasksService.update(orgId, id, userId, dto);
  }

  @Patch(':id/status')
  moveStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('status') status: TaskStatus,
  ) {
    return this.tasksService.moveStatus(orgId, id, status);
  }

  @Post(':id/comments')
  addComment(
    @OrgId() orgId: string,
    @Param('id') taskId: string,
    @CurrentUser('id') userId: string,
    @Body('content') content: string,
  ) {
    return this.tasksService.addComment(orgId, taskId, userId, content);
  }

  @Post(':id/watchers/:userId')
  addWatcher(
    @OrgId() orgId: string,
    @Param('id') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.addWatcher(orgId, taskId, userId);
  }

  @Delete(':id/watchers/:userId')
  removeWatcher(
    @OrgId() orgId: string,
    @Param('id') taskId: string,
    @Param('userId') userId: string,
  ) {
    return this.tasksService.removeWatcher(orgId, taskId, userId);
  }

  @Delete(':id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.tasksService.remove(orgId, id);
  }
}
