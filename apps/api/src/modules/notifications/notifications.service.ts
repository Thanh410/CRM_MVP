import { Injectable, NotFoundException } from '@nestjs/common';
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

  async markRead(orgId: string, userId: string, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, orgId, userId },
      data: { read: true, readAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Notification not found');
    return this.prisma.notification.findFirst({ where: { id, orgId, userId } });
  }

  async markAllRead(orgId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, orgId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async remove(orgId: string, userId: string, id: string) {
    const result = await this.prisma.notification.deleteMany({ where: { id, orgId, userId } });
    if (result.count === 0) throw new NotFoundException('Notification not found');
  }

  async unreadCount(userId: string, orgId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, orgId, read: false } });
  }
}
