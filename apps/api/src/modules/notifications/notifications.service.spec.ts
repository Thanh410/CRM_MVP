import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../prisma/prisma.service';

const orgId = 'org-1';
const userId = 'user-1';

const mockNotification = {
  id: 'notif-1',
  orgId,
  userId,
  type: 'LEAD_ASSIGNED',
  title: 'Bạn được giao 1 lead mới',
  body: 'Nguyễn Văn A',
  entityType: 'LEAD',
  entityId: 'lead-1',
  read: false,
  readAt: null,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  describe('create', () => {
    it('tạo notification với data đầy đủ', async () => {
      prisma.notification.create.mockResolvedValue(mockNotification);

      const result = await service.create({
        orgId,
        userId,
        type: 'LEAD_ASSIGNED' as any,
        title: 'Bạn được giao 1 lead mới',
        body: 'Nguyễn Văn A',
        entityType: 'LEAD' as any,
        entityId: 'lead-1',
      });

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ orgId, userId, type: 'LEAD_ASSIGNED' }),
      });
      expect(result).toEqual(mockNotification);
    });
  });

  describe('findAll', () => {
    it('trả về 50 notifications mới nhất', async () => {
      prisma.notification.findMany.mockResolvedValue([mockNotification]);

      await service.findAll(orgId, userId);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, orgId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('filter read=false khi onlyUnread=true', async () => {
      prisma.notification.findMany.mockResolvedValue([]);

      await service.findAll(orgId, userId, true);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, orgId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('markRead', () => {
    it('cập nhật read=true và set readAt', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 1 });
      prisma.notification.findFirst.mockResolvedValue({ ...mockNotification, read: true });

      await service.markRead(orgId, userId, 'notif-1');

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'notif-1', orgId, userId },
        data: expect.objectContaining({ read: true, readAt: expect.any(Date) }),
      });
    });
  });

  describe('markAllRead', () => {
    it('chỉ update notifications của user đó trong org đó, chưa read', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllRead(orgId, userId);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, orgId, read: false },
        data: expect.objectContaining({ read: true, readAt: expect.any(Date) }),
      });
      expect(result).toEqual({ message: 'All notifications marked as read' });
    });
  });

  describe('remove', () => {
    it('xóa notification theo id', async () => {
      prisma.notification.deleteMany.mockResolvedValue({ count: 1 });

      await service.remove(orgId, userId, 'notif-1');

      expect(prisma.notification.deleteMany).toHaveBeenCalledWith({ where: { id: 'notif-1', orgId, userId } });
    });
  });

  describe('unreadCount', () => {
    it('count notifications chưa đọc của user', async () => {
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.unreadCount(userId, orgId);

      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId, orgId, read: false },
      });
      expect(result).toBe(3);
    });

    it('trả về 0 khi không có notification nào', async () => {
      prisma.notification.count.mockResolvedValue(0);

      expect(await service.unreadCount(userId, orgId)).toBe(0);
    });
  });
});
