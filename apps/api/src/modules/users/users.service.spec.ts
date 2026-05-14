import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';

const orgId = 'org-1';
const actorId = 'admin-1';

const mockUser = {
  id: 'user-1',
  orgId,
  email: 'nv.a@x.vn',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  avatar: null,
  gender: null,
  jobTitle: 'Sales',
  status: 'ACTIVE',
  deptId: null,
  teamId: null,
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: any;
  let emitter: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    prisma = {
      user: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      userRole: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    emitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('tạo user mới, hash password với bcrypt rounds 12', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create(
        orgId,
        { email: 'nv.a@x.vn', password: 'plaintext123', fullName: 'Nguyễn Văn A' } as any,
        actorId,
      );

      expect(result).toEqual(mockUser);
      const createCall = prisma.user.create.mock.calls[0][0];
      // Verify password was hashed (not plaintext)
      expect(createCall.data.passwordHash).not.toBe('plaintext123');
      expect(createCall.data.passwordHash.startsWith('$2')).toBe(true); // bcrypt format
    });

    it('throw ConflictException nếu email đã tồn tại trong org', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.create(orgId, { email: 'nv.a@x.vn', password: 'x', fullName: 'A' } as any),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('assign role nếu roleId được truyền', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.userRole.create.mockResolvedValue({});

      await service.create(
        orgId,
        { email: 'a@x.vn', password: 'x', fullName: 'A', roleId: 'role-sales' } as any,
        actorId,
      );

      expect(prisma.userRole.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', roleId: 'role-sales', orgId },
      });
    });

    it('emit audit.create event', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await service.create(orgId, { email: 'a@x.vn', password: 'x', fullName: 'A' } as any, actorId);

      expect(emitter.emit).toHaveBeenCalledWith(
        'audit.create',
        expect.objectContaining({
          orgId,
          userId: actorId,
          action: 'CREATE',
          resource: 'users',
          resourceId: 'user-1',
        }),
      );
    });
  });

  describe('findAll', () => {
    it('trả về users của org đó, loại bỏ soft-deleted', async () => {
      prisma.$transaction.mockResolvedValue([[mockUser], 1]);

      const result = await service.findAll(orgId, { page: 1, limit: 20, skip: 0 });

      expect(result.data).toEqual([mockUser]);
      expect(result.meta.total).toBe(1);
      // Verify deletedAt:null filter
      expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ orgId, deletedAt: null });
    });

    it('search insensitive theo fullName OR email', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0, search: 'nguyễn' });

      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR[0]).toMatchObject({ fullName: { contains: 'nguyễn', mode: 'insensitive' } });
      expect(where.OR[1]).toMatchObject({ email: { contains: 'nguyễn', mode: 'insensitive' } });
    });
  });

  describe('findOne', () => {
    it('trả về user theo id trong org', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.findOne(orgId, 'user-1');

      expect(result).toEqual(mockUser);
      expect(prisma.user.findFirst.mock.calls[0][0].where).toMatchObject({
        id: 'user-1',
        orgId,
        deletedAt: null,
      });
    });

    it('throw NotFoundException nếu user không tồn tại', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('không trả về user ở org khác (multi-tenancy)', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.findOne('other-org', 'user-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('update user và emit audit', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, fullName: 'Tên mới' });

      const result = await service.update(orgId, 'user-1', { fullName: 'Tên mới' } as any, actorId);

      expect(result.fullName).toBe('Tên mới');
      expect(emitter.emit).toHaveBeenCalledWith(
        'audit.create',
        expect.objectContaining({ action: 'UPDATE', resource: 'users' }),
      );
    });

    it('throw NotFoundException khi user không có', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.update(orgId, 'x', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('set status=INACTIVE thay vì xóa', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, status: 'INACTIVE' });

      await service.deactivate(orgId, 'user-1', actorId);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'INACTIVE' },
      });
    });
  });

  describe('remove (soft delete)', () => {
    it('set deletedAt, KHÔNG xóa thật', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, deletedAt: new Date() });

      await service.remove(orgId, 'user-1', actorId);

      const updateCall = prisma.user.update.mock.calls[0][0];
      expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
      expect(emitter.emit).toHaveBeenCalledWith(
        'audit.create',
        expect.objectContaining({ action: 'DELETE', resource: 'users' }),
      );
    });
  });
});
