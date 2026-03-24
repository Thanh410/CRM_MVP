import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityType, ActivityType } from '@prisma/client';

@Injectable()
export class ActivitiesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, entityType?: EntityType, entityId?: string) {
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
    return this.prisma.activity.create({
      data: { orgId, userId, ...dto },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    return this.prisma.activity.findMany({
      where: { orgId, entityType, entityId },
      include: { user: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async markDone(orgId: string, id: string) {
    return this.prisma.activity.update({
      where: { id },
      data: { isDone: true, doneAt: new Date() },
    });
  }

  async remove(orgId: string, id: string) {
    const activity = await this.prisma.activity.findFirst({ where: { id, orgId } });
    if (!activity) throw new NotFoundException('Activity not found');
    await this.prisma.activity.delete({ where: { id } });
  }
}
