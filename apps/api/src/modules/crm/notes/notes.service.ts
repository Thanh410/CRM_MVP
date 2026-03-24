import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: { entityType: EntityType; entityId: string; content: string; isPinned?: boolean }, authorId?: string) {
    return this.prisma.note.create({
      data: { orgId, authorId, ...dto },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
    });
  }

  async findByEntity(orgId: string, entityType: EntityType, entityId: string) {
    return this.prisma.note.findMany({
      where: { orgId, entityType, entityId, deletedAt: null },
      include: { author: { select: { id: true, fullName: true, avatar: true } } },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(orgId: string, id: string, data: { content?: string; isPinned?: boolean }) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!note) throw new NotFoundException('Note not found');
    return this.prisma.note.update({ where: { id }, data });
  }

  async remove(orgId: string, id: string) {
    const note = await this.prisma.note.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.note.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
