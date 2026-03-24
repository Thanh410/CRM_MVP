import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, EntityType } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    orgId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body?: string;
    entityType?: EntityType;
    entityId?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  async findAll(orgId: string, userId: string, onlyUnread = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        orgId,
        ...(onlyUnread ? { read: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(orgId: string, id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });
  }

  async markAllRead(orgId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, orgId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async remove(orgId: string, id: string) {
    await this.prisma.notification.delete({ where: { id } });
  }

  async unreadCount(userId: string, orgId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, orgId, read: false } });
  }
}
