import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCampaignDto, CreateTemplateDto } from './dto/create-campaign.dto';
import { CampaignStatus } from '@prisma/client';

@Injectable()
export class MarketingService {
  constructor(private prisma: PrismaService) {}

  // ── Templates ──────────────────────────────────────────────

  async findAllTemplates(orgId: string) {
    return this.prisma.campaignTemplate.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(orgId: string, userId: string, dto: CreateTemplateDto) {
    return this.prisma.campaignTemplate.create({
      data: { ...dto, orgId, createdBy: userId },
    });
  }

  async updateTemplate(orgId: string, id: string, dto: Partial<CreateTemplateDto>) {
    const tmpl = await this.prisma.campaignTemplate.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!tmpl) throw new NotFoundException('Template not found');
    return this.prisma.campaignTemplate.update({ where: { id }, data: dto });
  }

  async removeTemplate(orgId: string, id: string) {
    const tmpl = await this.prisma.campaignTemplate.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!tmpl) throw new NotFoundException('Template not found');
    await this.prisma.campaignTemplate.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Campaigns ──────────────────────────────────────────────

  async findAll(orgId: string) {
    return this.prisma.campaign.findMany({
      where: { orgId, deletedAt: null },
      include: {
        template: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        template: true,
        logs: {
          include: { contact: { select: { id: true, fullName: true, email: true } } },
          orderBy: { sentAt: 'desc' },
          take: 100,
        },
      },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    return campaign;
  }

  async create(orgId: string, userId: string, dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
      data: {
        ...dto,
        orgId,
        createdBy: userId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        audienceFilter: dto.audienceFilter as any,
      },
    });
  }

  async update(orgId: string, id: string, dto: Partial<CreateCampaignDto>) {
    await this.findOne(orgId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        audienceFilter: dto.audienceFilter as any,
      },
    });
  }

  async launch(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });
  }

  async pause(orgId: string, id: string) {
    await this.findOne(orgId, id);
    return this.prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });
  }

  async getSummary(orgId: string, id: string) {
    const campaign = await this.findOne(orgId, id);
    const logs = await this.prisma.campaignLog.groupBy({
      by: ['status'],
      where: { campaignId: id },
      _count: { status: true },
    });
    const summary: Record<string, number> = {};
    logs.forEach((l) => (summary[l.status] = l._count.status));
    return {
      campaign: { id: campaign.id, name: campaign.name, status: campaign.status },
      sentCount: campaign.sentCount,
      openCount: campaign.openCount,
      logs: summary,
    };
  }

  async remove(orgId: string, id: string) {
    await this.findOne(orgId, id);
    await this.prisma.campaign.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Audience preview ───────────────────────────────────────

  async previewAudience(orgId: string, filter: Record<string, any>) {
    const where: any = { orgId, deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.source) where.source = filter.source;
    if (filter.tags?.length) {
      where.tags = { some: { tag: { name: { in: filter.tags } } } };
    }
    const count = await this.prisma.contact.count({ where });
    return { count };
  }
}
