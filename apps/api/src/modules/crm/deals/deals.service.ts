import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantScopeService } from '../../../common/services/tenant-scope.service';
import { PlanLimitsService } from '../../../common/services/plan-limits.service';
import { paginate } from '../../../common/dto/pagination.dto';
import type { BulkDeleteResult } from '../../../common/dto/bulk-delete.dto';
import { QueryDealDto } from './dto/query-deal.dto';

const DEAL_SELECT = {
  id: true, orgId: true, title: true, value: true, currency: true,
  status: true, probability: true, closeDate: true, description: true, lostReason: true,
  stageId: true, pipelineId: true, contactId: true, companyId: true, ownerId: true,
  createdAt: true, updatedAt: true,
  stage: { select: { id: true, name: true, color: true, order: true } },
  contact: { select: { id: true, fullName: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, fullName: true, avatar: true } },
};

@Injectable()
export class DealsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private tenantScope: TenantScopeService,
    private planLimits: PlanLimitsService,
  ) {}

  async create(orgId: string, dto: any, createdBy?: string) {
    const data = await this.withPipelineFromStage(orgId, dto);
    await this.validateRefs(orgId, data);
    await this.planLimits.assertCanCreate(orgId, 'deals');
    const deal = await this.prisma.deal.create({
      data: { orgId, createdBy, ...data },
      select: DEAL_SELECT,
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: createdBy, action: 'CREATE', resource: 'deals', resourceId: deal.id,
    });

    return deal;
  }

  async findAll(orgId: string, query: QueryDealDto) {
    const where: any = {
      orgId, deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.stageId ? { stageId: query.stageId } : {}),
      ...(query.ownerId ? { ownerId: query.ownerId } : {}),
      ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}),
      ...(query.closeDateFrom || query.closeDateTo
        ? {
            closeDate: {
              ...(query.closeDateFrom ? { gte: new Date(query.closeDateFrom) } : {}),
              ...(query.closeDateTo ? { lte: new Date(query.closeDateTo) } : {}),
            },
          }
        : {}),
      ...(query.search || query.q
        ? { title: { contains: query.search ?? query.q, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where, select: DEAL_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: query.all ? undefined : query.skip,
        take: query.all ? undefined : query.limit,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  // Returns deals grouped by stage for kanban view
  async getKanban(orgId: string, pipelineId?: string) {
    const pipeline = pipelineId
      ? await this.prisma.pipeline.findFirst({ where: { id: pipelineId, orgId } })
      : await this.prisma.pipeline.findFirst({ where: { orgId, isDefault: true } });

    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const stages = await this.prisma.dealStage.findMany({
      where: { pipelineId: pipeline.id, orgId },
      orderBy: { order: 'asc' },
    });

    const deals = await this.prisma.deal.findMany({
      where: { orgId, pipelineId: pipeline.id, status: 'OPEN', deletedAt: null },
      select: DEAL_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    const dealsByStage = stages.map((stage) => ({
      ...stage,
      deals: deals.filter((d) => d.stageId === stage.id),
      totalValue: deals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + Number(d.value), 0),
    }));

    return { pipeline, stages: dealsByStage };
  }

  async findOne(orgId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        stage: true,
        pipeline: { include: { stages: { orderBy: { order: 'asc' } } } },
        contact: { select: { id: true, fullName: true, email: true, phone: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, fullName: true, avatar: true } },
        tasks: {
          where: { deletedAt: null },
          include: { assignee: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!deal) throw new NotFoundException('Deal not found');
    return deal;
  }

  async update(orgId: string, id: string, dto: any, updatedBy?: string) {
    await this.findOneSimple(orgId, id);
    const data = await this.withPipelineFromStage(orgId, dto);
    await this.validateRefs(orgId, data);
    await this.prisma.deal.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { ...data, updatedBy },
    });
    return this.prisma.deal.findFirstOrThrow({ where: { id, orgId }, select: DEAL_SELECT });
  }

  async moveStage(orgId: string, id: string, stageId: string, actorId?: string) {
    const deal = await this.findOneSimple(orgId, id);

    const stage = await this.prisma.dealStage.findFirst({
      where: { id: stageId, orgId },
    });
    if (!stage) throw new BadRequestException('Stage not found');

    await this.prisma.deal.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { stageId, probability: stage.probability, updatedBy: actorId },
    });
    const updated = await this.prisma.deal.findFirstOrThrow({ where: { id, orgId }, select: DEAL_SELECT });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: actorId, action: 'UPDATE', resource: 'deals', resourceId: id,
      changes: { from: deal.stageId, to: stageId },
    });

    return updated;
  }

  async markWon(orgId: string, id: string, actorId?: string) {
    await this.findOneSimple(orgId, id);
    await this.prisma.deal.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { status: 'WON', probability: 100, updatedBy: actorId },
    });
    return this.prisma.deal.findFirstOrThrow({ where: { id, orgId }, select: DEAL_SELECT });
  }

  async markLost(orgId: string, id: string, lostReason?: string, actorId?: string) {
    await this.findOneSimple(orgId, id);
    await this.prisma.deal.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { status: 'LOST', probability: 0, lostReason, updatedBy: actorId },
    });
    return this.prisma.deal.findFirstOrThrow({ where: { id, orgId }, select: DEAL_SELECT });
  }

  async remove(orgId: string, id: string, actorId?: string) {
    await this.findOneSimple(orgId, id);
    await this.prisma.deal.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async bulkRemove(orgId: string, ids: string[], actorId?: string): Promise<BulkDeleteResult> {
    const uniqueIds = [...new Set(ids)];
    const existing = await this.prisma.deal.findMany({
      where: { id: { in: uniqueIds }, orgId, deletedAt: null },
      select: { id: true },
    });
    const deletedIds = existing.map((deal) => deal.id);

    if (deletedIds.length > 0) {
      await this.prisma.deal.updateMany({
        where: { id: { in: deletedIds }, orgId, deletedAt: null },
        data: { deletedAt: new Date(), updatedBy: actorId },
      });
      for (const id of deletedIds) {
        this.eventEmitter.emit('audit.create', {
          orgId, userId: actorId, action: 'DELETE', resource: 'deals', resourceId: id,
        });
      }
    }

    return {
      deletedIds,
      failedIds: uniqueIds.filter((id) => !deletedIds.includes(id)),
      count: deletedIds.length,
    };
  }

  // Pipeline management
  async getPipelines(orgId: string) {
    return this.prisma.pipeline.findMany({
      where: { orgId, deletedAt: null },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
  }

  private async findOneSimple(orgId: string, id: string) {
    const d = await this.prisma.deal.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!d) throw new NotFoundException('Deal not found');
    return d;
  }

  private async validateRefs(orgId: string, dto: any) {
    await this.tenantScope.ensureStage(orgId, dto.stageId);
    await this.tenantScope.ensurePipeline(orgId, dto.pipelineId);
    await this.tenantScope.ensureContact(orgId, dto.contactId);
    await this.tenantScope.ensureCompany(orgId, dto.companyId);
    await this.tenantScope.ensureUser(orgId, dto.ownerId);
  }

  private async withPipelineFromStage(orgId: string, dto: any) {
    if (!dto?.stageId) return dto;

    const stage = await this.prisma.dealStage.findFirst({
      where: { id: dto.stageId, orgId },
      select: { pipelineId: true },
    });
    if (!stage) throw new BadRequestException('Deal stage does not belong to organization');

    if (dto.pipelineId && dto.pipelineId !== stage.pipelineId) {
      throw new BadRequestException('Deal pipeline does not match selected stage');
    }

    return { ...dto, pipelineId: stage.pipelineId };
  }
}
