import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantScopeService } from '../../../common/services/tenant-scope.service';
import { EntityType, ActivityType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async findAll(orgId: string, entityType?: EntityType, entityId?: string) {
    if (entityType && entityId) {
      await this.tenantScope.ensureEntity(orgId, entityType, entityId);
    }
    const where: any = { orgId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return this.prisma.activity.findMany({
      where,
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async create(orgId: string, userId: string, dto: {
    type: ActivityType;
    entityType: EntityType;
    entityId: string;
    title: string;
    description?: string;
    occurredAt?: Date;
    dueAt?: Date;
    isDone?: boolean;
  }) {
    await this.tenantScope.ensureEntity(orgId, dto.entityType, dto.entityId);
    return this.prisma.activity.create({
      data: { orgId, userId, ...dto },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    await this.tenantScope.ensureEntity(orgId, entityType, entityId);
    return this.prisma.activity.findMany({
      where: { orgId, entityType, entityId },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async markDone(orgId: string, id: string) {
    const result = await this.prisma.activity.updateMany({
      where: { id, orgId },
      data: { isDone: true, doneAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Activity not found');
    return this.prisma.activity.findFirst({ where: { id, orgId } });
  }

  async remove(orgId: string, id: string) {
    const result = await this.prisma.activity.deleteMany({ where: { id, orgId } });
    if (result.count === 0) throw new NotFoundException('Activity not found');
  }
}
