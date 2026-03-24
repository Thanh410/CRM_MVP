import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(orgId: string) {
    const [
      totalLeads,
      leadsByStatus,
      totalContacts,
      totalCompanies,
      totalDeals,
      dealsByStage,
      openTasks,
      openConversations,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { orgId, deletedAt: null } }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { orgId, deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.contact.count({ where: { orgId, deletedAt: null } }),
      this.prisma.company.count({ where: { orgId, deletedAt: null } }),
      this.prisma.deal.count({ where: { orgId, deletedAt: null } }),
      this.prisma.deal.groupBy({
        by: ['stageId'],
        where: { orgId, deletedAt: null },
        _count: { stageId: true },
        _sum: { value: true },
      }),
      this.prisma.task.count({ where: { orgId, deletedAt: null, status: { not: 'DONE' } } }),
      this.prisma.conversation.count({ where: { orgId, deletedAt: null, status: 'OPEN' } }),
    ]);

    return {
      leads: {
        total: totalLeads,
        byStatus: leadsByStatus.map((l) => ({ status: l.status, count: l._count.status })),
      },
      contacts: { total: totalContacts },
      companies: { total: totalCompanies },
      deals: {
        total: totalDeals,
        byStage: dealsByStage.map((d) => ({
          stageId: d.stageId,
          count: d._count.stageId,
          totalValue: d._sum.value ?? 0,
        })),
      },
      tasks: { open: openTasks },
      conversations: { open: openConversations },
    };
  }

  async getSalesFunnel(orgId: string, pipelineId?: string) {
    const where: any = { orgId, deletedAt: null };
    if (pipelineId) where.stage = { pipelineId };

    const deals = await this.prisma.deal.groupBy({
      by: ['stageId'],
      where,
      _count: { stageId: true },
      _sum: { value: true },
    });

    const stages = await this.prisma.dealStage.findMany({
      where: { orgId, ...(pipelineId ? { pipelineId } : {}) },
      orderBy: { order: 'asc' },
    });

    return stages.map((stage) => {
      const data = deals.find((d) => d.stageId === stage.id);
      return {
        stage: { id: stage.id, name: stage.name, color: stage.color },
        count: data?._count.stageId ?? 0,
        totalValue: data?._sum.value ?? 0,
      };
    });
  }

  async getLeadsBySource(orgId: string) {
    return this.prisma.lead.groupBy({
      by: ['source'],
      where: { orgId, deletedAt: null },
      _count: { source: true },
    });
  }

  async getActivitiesTimeline(orgId: string, days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    return this.prisma.activity.findMany({
      where: { orgId, occurredAt: { gte: from } },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 200,
    });
  }

  async getCampaignStats(orgId: string) {
    return this.prisma.campaign.findMany({
      where: { orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        channel: true,
        status: true,
        sentCount: true,
        openCount: true,
        startDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
