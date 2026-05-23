import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { PartialType } from '@nestjs/swagger';
import { paginate } from '../../common/dto/pagination.dto';
import type { BulkDeleteResult } from '../../common/dto/bulk-delete.dto';
import { QueryProjectDto } from './dto/query-project.dto';

const BLOCKED_MARKER = '[[BLOCKED]]';
const PROGRESS_MARKER = '[[PROGRESS]]';
const DONE_MARKER = '[[DONE]]';

class UpdateProjectDto extends PartialType(CreateProjectDto) {}

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async findAll(orgId: string, query: QueryProjectDto) {
    const where = {
      orgId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { description: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          owner: { select: { id: true, fullName: true, avatar: true } },
          dept: { select: { id: true, name: true } },
          _count: { select: { tasks: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'desc' },
        ...(query.all ? {} : { skip: query.skip, take: query.limit }),
      }),
      this.prisma.project.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(orgId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        owner: { select: { id: true, fullName: true, avatar: true } },
        dept: { select: { id: true, name: true } },
        tasks: {
          where: { deletedAt: null, parentId: null },
          include: {
            assignee: { select: { id: true, fullName: true, avatar: true } },
            _count: { select: { subtasks: true, comments: true } },
            comments: {
              where: { deletedAt: null },
              select: { id: true, content: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    const progress = await this.getProgress(orgId, id);
    return {
      ...project,
      progress,
      tasks: project.tasks.map((task) => ({ ...task, isBlocked: this.isBlocked(task) })),
    };
  }

  async getProgress(orgId: string, id: string) {
    await this.prisma.project.findFirstOrThrow({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    const tasks = await this.prisma.task.findMany({
      where: { orgId, projectId: id, deletedAt: null },
      select: {
        id: true,
        status: true,
        dueDate: true,
        comments: {
          where: { deletedAt: null },
          select: { content: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const now = new Date();
    const doneCount = tasks.filter((task) => task.status === 'DONE').length;
    const pendingCount = tasks.filter((task) => task.status === 'REVIEW').length;
    const overdueCount = tasks.filter((task) => task.status !== 'DONE' && task.dueDate && task.dueDate < now).length;
    const blockedCount = tasks.filter((task) => this.isBlocked(task)).length;

    return {
      total: tasks.length,
      done: doneCount,
      pending: pendingCount,
      overdue: overdueCount,
      blocked: blockedCount,
      percent: tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0,
    };
  }

  async create(orgId: string, userId: string, dto: CreateProjectDto) {
    await this.tenantScope.ensureDepartment(orgId, dto.deptId);
    return this.prisma.project.create({
      data: {
        ...dto,
        orgId,
        ownerId: userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async update(orgId: string, id: string, dto: UpdateProjectDto) {
    await this.findOne(orgId, id);
    await this.tenantScope.ensureDepartment(orgId, dto.deptId);
    await this.prisma.project.updateMany({
      where: { id, orgId, deletedAt: null },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
    return this.findOne(orgId, id);
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.project.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRemove(orgId: string, ids: string[]): Promise<BulkDeleteResult> {
    const uniqueIds = [...new Set(ids)];
    const existing = await this.prisma.project.findMany({
      where: { id: { in: uniqueIds }, orgId, deletedAt: null },
      select: { id: true },
    });
    const deletedIds = existing.map((project) => project.id);

    if (deletedIds.length > 0) {
      await this.prisma.project.updateMany({
        where: { id: { in: deletedIds }, orgId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }

    return {
      deletedIds,
      failedIds: uniqueIds.filter((id) => !deletedIds.includes(id)),
      count: deletedIds.length,
    };
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
}
