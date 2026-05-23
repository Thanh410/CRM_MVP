import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { EntityType, NotificationType, TaskStatus } from '@prisma/client';

const BLOCKED_MARKER = '[[BLOCKED]]';
const PROGRESS_MARKER = '[[PROGRESS]]';
const DONE_MARKER = '[[DONE]]';
const PENDING_MARKER = '[[PENDING]]';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
    private notificationsService: NotificationsService,
  ) {}

  private taskIncludes = {
    assignee: { select: { id: true, fullName: true, avatar: true } },
    project: { select: { id: true, name: true } },
    watchers: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
    comments: {
      where: { deletedAt: null },
      select: { id: true, content: true, createdAt: true, authorId: true },
      orderBy: { createdAt: 'desc' as const },
    },
    _count: { select: { subtasks: true, comments: true } },
  };

  async findAll(orgId: string, userId: string, query: QueryTaskDto) {
    const where: any = { orgId, deletedAt: null, parentId: null };

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.projectId) where.projectId = query.projectId;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.mine === 'true') where.assigneeId = userId;
    if (query.watched === 'true') where.watchers = { some: { userId } };
    if (query.overdue === 'true') where.dueDate = { lt: new Date() };
    if (query.pending === 'true') where.status = 'REVIEW';
    if (query.blocked === 'true') where.comments = { some: { deletedAt: null, content: { startsWith: BLOCKED_MARKER } } };
    if (query.search) where.title = { contains: query.search, mode: 'insensitive' };

    const tasks = await this.prisma.task.findMany({
      where,
      include: this.taskIncludes,
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
    const withBlockedState = tasks.map((task) => ({ ...task, isBlocked: this.isBlocked(task) }));
    return query.blocked === 'true' ? withBlockedState.filter((task) => task.isBlocked) : withBlockedState;
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
        watchers: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
        comments: {
          where: { deletedAt: null },
          select: { id: true, content: true, createdAt: true, authorId: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { subtasks: true, comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return statuses.map((status) => ({
      status,
      tasks: tasks.filter((t) => t.status === status).map((task) => ({ ...task, isBlocked: this.isBlocked(task) })),
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
    await this.validateRefs(orgId, dto);
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
    if (task.assigneeId && task.assigneeId !== userId) {
      await this.notificationsService.create({
        orgId,
        userId: task.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Bạn được giao nhiệm vụ mới',
        body: task.project?.name ? `${task.title} · ${task.project.name}` : task.title,
        entityType: EntityType.TASK,
        entityId: task.id,
      });
    }
    return task;
  }

  async update(orgId: string, id: string, userId: string, dto: Partial<CreateTaskDto>) {
    const before = await this.findOne(orgId, id);
    await this.validateRefs(orgId, dto);
    const { watcherIds, ...rest } = dto;
    await this.prisma.task.updateMany({
      where: { id, orgId, deletedAt: null },
      data: {
        ...rest,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        updatedBy: userId,
      },
    });
    const updated = await this.findOne(orgId, id);
    if (dto.assigneeId && dto.assigneeId !== before.assigneeId && dto.assigneeId !== userId) {
      await this.notificationsService.create({
        orgId,
        userId: dto.assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Bạn được giao nhiệm vụ',
        body: updated.project?.name ? `${updated.title} · ${updated.project.name}` : updated.title,
        entityType: EntityType.TASK,
        entityId: updated.id,
      });
    }
    if (dto.dueDate && dto.dueDate !== (before.dueDate ? before.dueDate.toISOString().slice(0, 10) : undefined)) {
      await this.notifyTaskAudience(orgId, updated as any, userId, 'Cập nhật hạn chót nhiệm vụ', updated.title, NotificationType.SYSTEM);
    }
    if (dto.status && dto.status !== before.status) {
      await this.notifyStatusChange(orgId, updated as any, userId, dto.status);
    }
    return updated;
  }

  async moveStatus(orgId: string, id: string, userId: string, status: TaskStatus) {
    const before = await this.findOne(orgId, id);
    await this.prisma.task.updateMany({ where: { id, orgId, deletedAt: null }, data: { status } });
    const updated = await this.findOne(orgId, id);
    if (before.status !== status) {
      await this.notifyStatusChange(orgId, updated as any, userId, status);
    }
    return updated;
  }

  async addComment(orgId: string, taskId: string, userId: string, content: string) {
    const task = await this.findOne(orgId, taskId);
    const comment = await this.prisma.taskComment.create({
      data: { taskId, authorId: userId, content },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
    });
    const nextStatus = content.startsWith(PENDING_MARKER)
      ? TaskStatus.REVIEW
      : content.startsWith(DONE_MARKER)
      ? TaskStatus.DONE
      : undefined;
    if (nextStatus) {
      await this.prisma.task.updateMany({ where: { id: taskId, orgId, deletedAt: null }, data: { status: nextStatus, updatedBy: userId } });
    }
    const notificationTitle = content.startsWith(BLOCKED_MARKER)
      ? 'Task đang gặp khó khăn'
      : content.startsWith(PENDING_MARKER)
      ? 'Task đang pending'
      : content.startsWith(DONE_MARKER)
      ? 'Task đã hoàn tất'
      : 'Task có cập nhật mới';
    await this.notifyTaskAudience(orgId, task as any, userId, notificationTitle, this.stripProgressMarker(content), NotificationType.SYSTEM);
    return comment;
  }

  async addWatcher(orgId: string, taskId: string, userId: string) {
    await this.findOne(orgId, taskId);
    await this.tenantScope.ensureUser(orgId, userId);
    const exists = await this.prisma.taskWatcher.findUnique({
      where: { taskId_userId: { taskId, userId } },
    });
    if (!exists) {
      await this.prisma.taskWatcher.create({ data: { taskId, userId } });
      await this.notificationsService.create({
        orgId,
        userId,
        type: NotificationType.SYSTEM,
        title: 'Bạn được thêm theo dõi task',
        body: 'Bạn sẽ nhận cập nhật tiến trình của task này.',
        entityType: EntityType.TASK,
        entityId: taskId,
      });
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
    await this.prisma.task.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async validateRefs(orgId: string, dto: Partial<CreateTaskDto>) {
    await this.tenantScope.ensureProject(orgId, dto.projectId);
    await this.tenantScope.ensureTask(orgId, dto.parentId);
    await this.tenantScope.ensureUser(orgId, dto.assigneeId);
    await this.tenantScope.ensureLead(orgId, (dto as any).leadId);
    await this.tenantScope.ensureContact(orgId, (dto as any).contactId);
    await this.tenantScope.ensureDeal(orgId, (dto as any).dealId);
    await this.tenantScope.ensureUsers(orgId, dto.watcherIds);
    if (dto.entityType && dto.entityId) {
      await this.tenantScope.ensureEntity(orgId, dto.entityType, dto.entityId);
    }
  }

  private isBlocked(task: { comments?: Array<{ content: string; createdAt: Date }> }) {
    const latestProgress = [...(task.comments ?? [])]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .find((comment) =>
        comment.content.startsWith(BLOCKED_MARKER) ||
        comment.content.startsWith(PROGRESS_MARKER) ||
        comment.content.startsWith(DONE_MARKER),
      );
    return latestProgress?.content.startsWith(BLOCKED_MARKER) ?? false;
  }

  private stripProgressMarker(content: string) {
    return content.replace(/^\[\[(BLOCKED|PROGRESS|DONE|PENDING)\]\]\s*/, '');
  }

  private async notifyStatusChange(orgId: string, task: any, actorId: string, status: TaskStatus) {
    if (status === TaskStatus.REVIEW) {
      await this.notifyTaskAudience(orgId, task, actorId, 'Task đang pending', task.title, NotificationType.SYSTEM);
    } else if (status === TaskStatus.DONE) {
      await this.notifyTaskAudience(orgId, task, actorId, 'Task đã hoàn thành', task.title, NotificationType.SYSTEM);
    }
  }

  private getAudience(task: any, actorId?: string) {
    const ids = new Set<string>();
    if (task.assigneeId) ids.add(task.assigneeId);
    for (const watcher of task.watchers ?? []) {
      const watcherUserId = watcher.userId ?? watcher.user?.id;
      if (watcherUserId) ids.add(watcherUserId);
    }
    if (actorId) ids.delete(actorId);
    return [...ids];
  }

  private async notifyTaskAudience(
    orgId: string,
    task: any,
    actorId: string | undefined,
    title: string,
    body: string,
    type: NotificationType,
  ) {
    const audience = this.getAudience(task, actorId);
    await Promise.all(
      audience.map((recipientId) =>
        this.notificationsService.create({
          orgId,
          userId: recipientId,
          type,
          title,
          body: task.project?.name ? `${body} · ${task.project.name}` : body,
          entityType: EntityType.TASK,
          entityId: task.id,
        }),
      ),
    );
  }
}
