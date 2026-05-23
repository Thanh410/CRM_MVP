import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const orgId = 'org-1';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AuditService);
  });

  describe('handleAuditCreate (OnEvent audit.create)', () => {
    it('lưu audit log với đầy đủ trường', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.handleAuditCreate({
        orgId,
        userId: 'user-1',
        action: 'CREATE' as any,
        resource: 'leads',
        resourceId: 'lead-1',
        changes: { fullName: 'Nguyễn Văn A' },
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          userId: 'user-1',
          action: 'CREATE',
          resource: 'leads',
          resourceId: 'lead-1',
          changes: { fullName: 'Nguyễn Văn A' },
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });

    it('chấp nhận event không có userId (system action)', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.handleAuditCreate({
        orgId,
        action: 'EXPORT' as any,
        resource: 'leads',
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          action: 'EXPORT',
          resource: 'leads',
          userId: undefined,
        }),
      });
    });

    it('lưu changes undefined khi không truyền', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.handleAuditCreate({
        orgId,
        action: 'LOGIN' as any,
        resource: 'auth',
        userId: 'user-1',
      });

      expect(prisma.auditLog.create.mock.calls[0][0].data.changes).toBeUndefined();
    });
  });

  describe('findAll', () => {
    const mockLog = {
      id: 'audit-1',
      orgId,
      userId: 'user-1',
      action: 'UPDATE',
      resource: 'leads',
      resourceId: 'lead-1',
      ip: '1.1.1.1',
      createdAt: new Date(),
      user: { id: 'user-1', fullName: 'Admin', email: 'admin@x.vn' },
    };

    it('trả về paginated audit logs theo orgId', async () => {
      prisma.$transaction.mockResolvedValue([[mockLog], 1]);

      const result = await service.findAll(orgId, { page: 1, limit: 20, skip: 0 });

      expect(result.data).toEqual([mockLog]);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
    });

    it('filter theo resource', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0, resource: 'leads' });

      const findManyCall = prisma.auditLog.findMany.mock.calls[0][0];
      expect(findManyCall.where).toEqual({ orgId, resource: 'leads' });
    });

    it('filter theo userId', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0, userId: 'user-X' });

      expect(prisma.auditLog.findMany.mock.calls[0][0].where).toEqual({
        orgId,
        userId: 'user-X',
      });
    });

    it('combine cả resource + userId filter', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, {
        page: 1,
        limit: 20,
        skip: 0,
        resource: 'deals',
        userId: 'user-Y',
      });

      expect(prisma.auditLog.findMany.mock.calls[0][0].where).toEqual({
        orgId,
        resource: 'deals',
        userId: 'user-Y',
      });
    });

    it('sắp xếp theo createdAt DESC (mới nhất trước)', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0 });

      expect(prisma.auditLog.findMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
    });

    it('include user info (id, fullName, email) — không include password', async () => {
      prisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0 });

      expect(prisma.auditLog.findMany.mock.calls[0][0].include).toEqual({
        user: { select: { id: true, fullName: true, email: true } },
      });
    });
  });
});
