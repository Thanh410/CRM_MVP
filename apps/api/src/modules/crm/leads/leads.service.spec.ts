import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../../prisma/prisma.service';

// ── Mock data ─────────────────────────────────────────────
const orgId = 'org-1';
const userId = 'user-1';

const mockLead = {
  id: 'lead-1',
  orgId,
  fullName: 'Nguyễn Văn A',
  email: 'nguyenvana@test.vn',
  phone: '0901234567',
  status: 'NEW',
  source: 'WEBSITE',
  utmSource: null,
  utmMedium: null,
  utmCampaign: null,
  description: null,
  assignedTo: userId,
  convertedContactId: null,
  convertedAt: null,
  createdBy: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  assignee: { id: userId, fullName: 'Admin', avatar: null },
};

// ── Mock Prisma ───────────────────────────────────────────
const mockPrisma = {
  lead: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  contact: {
    create: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };

// ── Test Suite ────────────────────────────────────────────
describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('creates a lead and emits audit event', async () => {
      mockPrisma.lead.create.mockResolvedValue(mockLead);

      const dto = { fullName: 'Nguyễn Văn A', email: 'nguyenvana@test.vn', phone: '0901234567' };
      const result = await service.create(orgId, dto as any, userId);

      expect(result).toMatchObject({ id: 'lead-1', fullName: 'Nguyễn Văn A' });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        action: 'CREATE',
        resource: 'leads',
      }));
    });
  });

  // ── findAll ────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated leads', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockLead], 1]);

      const result = await service.findAll(orgId, { page: 1, limit: 20, skip: 0 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ total: 1, page: 1 });
    });

    it('supports search across fullName, email, phone', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0, search: 'nguyenvana' } as any);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ────────────────────────────────────────────

  describe('findOne', () => {
    it('returns lead with tasks', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({ ...mockLead, tasks: [] });

      const result = await service.findOne(orgId, 'lead-1');

      expect(result).toMatchObject({ id: 'lead-1' });
    });

    it('throws NotFoundException when not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('updates lead and emits audit', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, status: 'CONTACTED' });

      const result = await service.update(orgId, 'lead-1', { status: 'CONTACTED' } as any, userId);

      expect(result.status).toBe('CONTACTED');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        action: 'UPDATE',
      }));
    });

    it('throws NotFoundException when updating nonexistent lead', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.update(orgId, 'no-lead', {} as any, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── assign ─────────────────────────────────────────────

  describe('assign', () => {
    it('assigns a lead to a user in the same org', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-2', orgId });
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedTo: 'user-2' });

      const result = await service.assign(orgId, 'lead-1', 'user-2', userId);

      expect(result.assignedTo).toBe('user-2');
    });

    it('throws BadRequestException when assignee not in org', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.assign(orgId, 'lead-1', 'bad-user', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── convert ────────────────────────────────────────────

  describe('convert', () => {
    it('converts lead to contact', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.contact.create.mockResolvedValue({ id: 'contact-new' });
      mockPrisma.lead.update.mockResolvedValue({});

      const result = await service.convert(orgId, 'lead-1', userId);

      expect(result).toMatchObject({
        lead: 'lead-1',
        contact: { id: 'contact-new' },
      });
      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId,
            fullName: 'Nguyễn Văn A',
            email: 'nguyenvana@test.vn',
          }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        changes: expect.objectContaining({ action: 'converted' }),
      }));
    });

    it('throws ConflictException if lead already converted', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue({
        ...mockLead,
        convertedContactId: 'contact-old',
      });

      await expect(service.convert(orgId, 'lead-1', userId)).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException if lead not found', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(null);

      await expect(service.convert(orgId, 'no-lead', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes and emits audit', async () => {
      mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
      mockPrisma.lead.update.mockResolvedValue({});

      await service.remove(orgId, 'lead-1', userId);

      expect(mockPrisma.lead.update).toHaveBeenCalledWith({
        where: { id: 'lead-1' },
        data: { deletedAt: expect.any(Date), updatedBy: userId },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        action: 'DELETE',
      }));
    });
  });

  // ── CSV Import ─────────────────────────────────────────

  describe('importCsv', () => {
    it('imports valid CSV rows', async () => {
      const csv = Buffer.from(
        'Họ tên,Email,Điện thoại\nTrần B,tranb@test.vn,0912345678\nLê C,lec@test.vn,0923456789',
      );
      mockPrisma.lead.create.mockResolvedValue({});

      const result = await service.importCsv(orgId, csv, userId);

      expect(result.total).toBe(2);
      expect(result.created).toBe(2);
      expect(result.errors).toBe(0);
    });

    it('rejects rows with missing fullName', async () => {
      const csv = Buffer.from('Họ tên,Email\n,bad@test.vn\nGood Name,ok@test.vn');
      mockPrisma.lead.create.mockResolvedValue({});

      const result = await service.importCsv(orgId, csv, userId);

      expect(result.total).toBe(2);
      expect(result.created).toBe(1);
      expect(result.errors).toBe(1);
      expect(result.rowErrors[0].message).toContain('họ tên');
    });

    it('rejects rows with invalid email', async () => {
      const csv = Buffer.from('Họ tên,Email\nTest User,not-an-email');
      mockPrisma.lead.create.mockResolvedValue({});

      const result = await service.importCsv(orgId, csv, userId);

      expect(result.errors).toBe(1);
      expect(result.rowErrors[0].message).toContain('Email không hợp lệ');
    });
  });

  // ── CSV Export ─────────────────────────────────────────

  describe('exportCsv', () => {
    it('returns a CSV buffer with correct headers', async () => {
      mockPrisma.lead.findMany.mockResolvedValue([{
        ...mockLead,
        createdAt: new Date('2026-01-15'),
      }]);

      const buffer = await service.exportCsv(orgId);

      const csv = buffer.toString('utf-8');
      expect(csv).toContain('Họ tên');
      expect(csv).toContain('Nguyễn Văn A');
      expect(csv).toContain('nguyenvana@test.vn');
    });
  });
});
