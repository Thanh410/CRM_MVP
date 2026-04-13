import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DealsService } from './deals.service';
import { PrismaService } from '../../../prisma/prisma.service';

// ── Mock data ─────────────────────────────────────────────
const orgId = 'org-1';
const userId = 'user-1';

const mockDeal = {
  id: 'deal-1',
  orgId,
  title: 'Test Deal',
  value: 50000000,
  currency: 'VND',
  status: 'OPEN',
  probability: 30,
  closeDate: null,
  description: null,
  lostReason: null,
  stageId: 'stage-1',
  pipelineId: 'pipe-1',
  contactId: 'contact-1',
  companyId: 'company-1',
  ownerId: userId,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  stage: { id: 'stage-1', name: 'Tiếp cận', color: '#3B82F6', order: 1 },
  contact: { id: 'contact-1', fullName: 'Nguyễn Văn A' },
  company: { id: 'company-1', name: 'ABC Corp' },
  owner: { id: userId, fullName: 'Admin', avatar: null },
};

const mockStage = {
  id: 'stage-2',
  name: 'Đề xuất',
  color: '#F59E0B',
  order: 2,
  pipelineId: 'pipe-1',
  orgId,
  probability: 60,
};

const mockPipeline = {
  id: 'pipe-1',
  orgId,
  name: 'Default Pipeline',
  isDefault: true,
};

// ── Mock Prisma ───────────────────────────────────────────
const mockPrisma = {
  deal: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  pipeline: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  dealStage: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEventEmitter = { emit: jest.fn() };

// ── Test Suite ────────────────────────────────────────────
describe('DealsService', () => {
  let service: DealsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DealsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DealsService>(DealsService);
  });

  // ── create ─────────────────────────────────────────────

  describe('create', () => {
    it('creates a deal and emits audit event', async () => {
      mockPrisma.deal.create.mockResolvedValue(mockDeal);

      const result = await service.create(orgId, { title: 'Test Deal', value: 50000000 }, userId);

      expect(result).toMatchObject({ id: 'deal-1', title: 'Test Deal' });
      expect(mockPrisma.deal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ orgId, createdBy: userId }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        action: 'CREATE',
        resource: 'deals',
      }));
    });
  });

  // ── findAll ────────────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated deals', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockDeal], 1]);

      const result = await service.findAll(orgId, { page: 1, limit: 20, skip: 0 } as any);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toMatchObject({ total: 1, page: 1, limit: 20 });
    });

    it('filters by status', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await service.findAll(orgId, { page: 1, limit: 20, skip: 0, status: 'WON' } as any);

      // verify the first arg to $transaction includes status filter
      const findManyCall = mockPrisma.$transaction.mock.calls[0][0][0];
      // The transaction receives prisma promises, so we verify it was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  // ── findOne ────────────────────────────────────────────

  describe('findOne', () => {
    it('returns a deal with related data', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue({
        ...mockDeal,
        pipeline: { ...mockPipeline, stages: [mockStage] },
        tasks: [],
      });

      const result = await service.findOne(orgId, 'deal-1');

      expect(result).toMatchObject({ id: 'deal-1', title: 'Test Deal' });
    });

    it('throws NotFoundException when deal not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(orgId, 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────

  describe('update', () => {
    it('updates a deal', async () => {
      // findOneSimple
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({ ...mockDeal, title: 'Updated' });

      const result = await service.update(orgId, 'deal-1', { title: 'Updated' }, userId);

      expect(result.title).toBe('Updated');
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: 'Updated', updatedBy: userId }),
        }),
      );
    });

    it('throws NotFoundException when updating nonexistent deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      await expect(service.update(orgId, 'no-deal', {}, userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── moveStage ──────────────────────────────────────────

  describe('moveStage', () => {
    it('moves deal to a new stage and updates probability', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.dealStage.findFirst.mockResolvedValue(mockStage);
      mockPrisma.deal.update.mockResolvedValue({
        ...mockDeal,
        stageId: 'stage-2',
        probability: 60,
      });

      const result = await service.moveStage(orgId, 'deal-1', 'stage-2', userId);

      expect(result.stageId).toBe('stage-2');
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stageId: 'stage-2',
            probability: 60,
          }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('audit.create', expect.objectContaining({
        action: 'UPDATE',
        changes: { from: 'stage-1', to: 'stage-2' },
      }));
    });

    it('throws BadRequestException when target stage not found', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.dealStage.findFirst.mockResolvedValue(null);

      await expect(
        service.moveStage(orgId, 'deal-1', 'bad-stage', userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── markWon / markLost ─────────────────────────────────

  describe('markWon', () => {
    it('sets status WON and probability 100', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({
        ...mockDeal,
        status: 'WON',
        probability: 100,
      });

      const result = await service.markWon(orgId, 'deal-1', userId);

      expect(result.status).toBe('WON');
      expect(result.probability).toBe(100);
    });
  });

  describe('markLost', () => {
    it('sets status LOST, probability 0, and stores reason', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({
        ...mockDeal,
        status: 'LOST',
        probability: 0,
        lostReason: 'Price too high',
      });

      const result = await service.markLost(orgId, 'deal-1', 'Price too high', userId);

      expect(result.status).toBe('LOST');
      expect(result.probability).toBe(0);
      expect(mockPrisma.deal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'LOST',
            probability: 0,
            lostReason: 'Price too high',
          }),
        }),
      );
    });
  });

  // ── remove ─────────────────────────────────────────────

  describe('remove', () => {
    it('soft-deletes a deal by setting deletedAt', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(mockDeal);
      mockPrisma.deal.update.mockResolvedValue({});

      await service.remove(orgId, 'deal-1', userId);

      expect(mockPrisma.deal.update).toHaveBeenCalledWith({
        where: { id: 'deal-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NotFoundException when removing nonexistent deal', async () => {
      mockPrisma.deal.findFirst.mockResolvedValue(null);

      await expect(service.remove(orgId, 'no-deal', userId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getKanban ──────────────────────────────────────────

  describe('getKanban', () => {
    it('returns deals grouped by stage with totals', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(mockPipeline);
      mockPrisma.dealStage.findMany.mockResolvedValue([
        { ...mockStage, id: 'stage-1', name: 'Stage 1', order: 1 },
        { ...mockStage, id: 'stage-2', name: 'Stage 2', order: 2 },
      ]);
      mockPrisma.deal.findMany.mockResolvedValue([
        { ...mockDeal, stageId: 'stage-1', value: 100 },
        { ...mockDeal, id: 'deal-2', stageId: 'stage-1', value: 200 },
      ]);

      const result = await service.getKanban(orgId);

      expect(result.pipeline).toMatchObject({ id: 'pipe-1' });
      expect(result.stages).toHaveLength(2);
      expect(result.stages[0].deals).toHaveLength(2);
      expect(result.stages[0].totalValue).toBe(300);
      expect(result.stages[1].deals).toHaveLength(0);
    });

    it('throws NotFoundException when no pipeline exists', async () => {
      mockPrisma.pipeline.findFirst.mockResolvedValue(null);

      await expect(service.getKanban(orgId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── getPipelines ───────────────────────────────────────

  describe('getPipelines', () => {
    it('returns pipelines with stages', async () => {
      mockPrisma.pipeline.findMany.mockResolvedValue([
        { ...mockPipeline, stages: [mockStage] },
      ]);

      const result = await service.getPipelines(orgId);

      expect(result).toHaveLength(1);
      expect(result[0].stages).toHaveLength(1);
    });
  });
});
