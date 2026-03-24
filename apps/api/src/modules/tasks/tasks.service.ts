import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { TaskStatus } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private taskIncludes = {
    assignee: { select: { id: true, fullName: true, avatar: true } },
    project: { select: { id: true, name: true } },
    watchers: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
    _count: { select: { subtasks: true, comments: true } },
  };

  async findAll(orgId: string, userId: string, query: QueryTaskDto) {
    const where: any = { orgId, deletedAt: null, parentId: null };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.projectId) where.projectId = query.projectId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.mine === 'true') where.assigneeId = userId;
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    return this.prisma.task.findMany({
      where,
      include: this.taskIncludes,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async getKanban(orgId: string, projectId?: string) {
    const statuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as TaskStatus[];
    const where: any = { orgId, deletedAt: null, parentId: null };
    if (projectId) where.projectId = projectId;

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, fullName: true, avatar: true } },
        project: { select: { id: true, name: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return statuses.map((status) => ({
      status,
      tasks: tasks.filter((t) => t.status === status),
      count: tasks.filter((t) => t.status === status).length,
    }));
  }

  async findOne(orgId: string, id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        ...this.taskIncludes,
        subtasks: {
          where: { deletedAt: null },
          include: { assignee: { select: { id: true, fullName: true, avatar: true } } },
        },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, fullName: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async create(orgId: string, userId: string, dto: CreateTaskDto) {
    const { watcherIds, ...rest } = dto;
    const task = await this.prisma.task.create({
      data: {
        ...rest,
        orgId,
        createdBy: userId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        watchers: watcherIds?.length
          ? { create: watcherIds.map((uid) => ({ userId: uid })) }
          : undefined,
      },
      include: this.taskIncludes,
    });
    return task;
  }

  async update(orgId: string, id: string, userId: string, dto: Partial<CreateTaskDto>) {
    await this.findOne(orgId, id);
    const { watcherIds, ...rest } = dto;
    return this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        updatedBy: userId,
      },
      include: this.taskIncludes,
    });
  }

  async moveStatus(orgId: string, id: string, status: TaskStatus) {
    await this.findOne(orgId, id);
    return this.prisma.task.update({ where: { id }, data: { status } });
  }

  async addComment(orgId: string, taskId: string, userId: string, content: string) {
    await this.findOne(orgId, taskId);
    return this.prisma.taskComment.create({
      data: { taskId, authorId: userId, content },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async addWatcher(orgId: string, taskId: string, userId: string) {
    await this.findOne(orgId, taskId);
    const exists = await this.prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (!exists) {
      await this.prisma.taskWatcher.create({ data: { taskId, userId } });
    }
    return { message: 'Watcher added' };
  }

  async removeWatcher(orgId: string, taskId: string, userId: string) {
    await this.findOne(orgId, taskId);
    await this.prisma.taskWatcher.deleteMany({ where: { taskId, userId } });
    return { message: 'Watcher removed' };
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
