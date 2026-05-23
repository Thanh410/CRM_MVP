import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantScopeService } from '../../../common/services/tenant-scope.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async create(orgId: string, dto: { entityType: EntityType; entityId: string; content: string; isPinned?: boolean }, authorId?: string) {
    await this.tenantScope.ensureEntity(orgId, dto.entityType, dto.entityId);
    return this.prisma.note.create({
      data: { orgId, authorId, ...dto },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    await this.tenantScope.ensureEntity(orgId, entityType, entityId);
    return this.prisma.note.findMany({
      where: { orgId, entityType, entityId, deletedAt: null },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(orgId: string, id: string, data: { content?: string; isPinned?: boolean }) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.note.updateMany({ where: { id, orgId, deletedAt: null }, data });
    return this.prisma.note.findFirst({ where: { id, orgId } });
  }

  async remove(orgId: string, id: string) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.note.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}
