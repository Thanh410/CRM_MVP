import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

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
    await this.prisma.entityTag.deleteMany({ where: { tagId: id } });
    await this.prisma.tag.delete({ where: { id } });
  }

  async addToEntity(orgId: string, tagId: string, entityType: EntityType, entityId: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, orgId } });
    if (!tag) throw new NotFoundException('Tag not found');

    await this.prisma.entityTag.upsert({
      where: { entityType_entityId_tagId: { entityType, entityId, tagId } },
      create: { entityType, entityId, tagId },
      update: {},
    });
  }

  async removeFromEntity(tagId: string, entityType: EntityType, entityId: string) {
    await this.prisma.entityTag.delete({
      where: { entityType_entityId_tagId: { entityType, entityId, tagId } },
    });
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    const rows = await this.prisma.entityTag.findMany({
      where: { entityType, entityId, tag: { orgId } },
      include: { tag: true },
    });
    return rows.map(r => r.tag);
  }
}
