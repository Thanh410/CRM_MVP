import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantScopeService } from '../../../common/services/tenant-scope.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async findAll(orgId: string) {
    return this.prisma.tag.findMany({
      where: { orgId },
      include: { _count: { select: { entities: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(orgId: string, data: { name: string; color?: string }) {
    return this.prisma.tag.upsert({
      where: { orgId_name: { orgId, name: data.name } },
      create: { orgId, ...data },
      update: { color: data.color },
    });
  }

  async remove(orgId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, orgId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.prisma.entityTag.deleteMany({ where: { tagId: id, orgId } });
    await this.prisma.tag.deleteMany({ where: { id, orgId } });
  }

  async addToEntity(orgId: string, tagId: string, entityType: EntityType, entityId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, orgId } });
    if (!tag) throw new NotFoundException('Tag not found');
    await this.tenantScope.ensureEntity(orgId, entityType, entityId);

    await this.prisma.entityTag.upsert({
      where: { orgId_entityType_entityId_tagId: { orgId, entityType, entityId, tagId } },
      create: { orgId, entityType, entityId, tagId },
      update: {},
    });
  }

  async removeFromEntity(orgId: string, tagId: string, entityType: EntityType, entityId: string) {
    await this.tenantScope.ensureEntity(orgId, entityType, entityId);
    const result = await this.prisma.entityTag.deleteMany({
      where: { orgId, entityType, entityId, tagId },
    });
    if (result.count === 0) throw new NotFoundException('Tag entity link not found');
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    await this.tenantScope.ensureEntity(orgId, entityType, entityId);
    const rows = await this.prisma.entityTag.findMany({
      where: { orgId, entityType, entityId },
      include: { tag: true },
    });
    return rows.map(r => r.tag);
  }
}
