import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TenantScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureUser(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.user.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('User does not belong to organization');
  }

  async ensureUsers(orgId: string, ids?: string[] | null) {
    const uniqueIds = [...new Set(ids?.filter(Boolean) ?? [])];
    if (uniqueIds.length === 0) return;
    const count = await this.prisma.user.count({
      where: { id: { in: uniqueIds }, orgId, deletedAt: null },
    });
    if (count !== uniqueIds.length) {
      throw new BadRequestException('One or more users do not belong to organization');
    }
  }

  async ensureRole(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.role.count({ where: { id, orgId } });
    if (!exists) throw new BadRequestException('Role does not belong to organization');
  }

  async ensureDepartment(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.department.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Department does not belong to organization');
  }

  async ensureTeam(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.team.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Team does not belong to organization');
  }

  async ensureCompany(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.company.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Company does not belong to organization');
  }

  async ensureContact(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.contact.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Contact does not belong to organization');
  }

  async ensureLead(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.lead.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Lead does not belong to organization');
  }

  async ensureDeal(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.deal.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Deal does not belong to organization');
  }

  async ensureProject(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.project.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Project does not belong to organization');
  }

  async ensurePipeline(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.pipeline.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Pipeline does not belong to organization');
  }

  async ensureStage(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.dealStage.count({ where: { id, orgId } });
    if (!exists) throw new BadRequestException('Deal stage does not belong to organization');
  }

  async ensureTemplate(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.campaignTemplate.count({
      where: { id, orgId, deletedAt: null },
    });
    if (!exists) throw new BadRequestException('Campaign template does not belong to organization');
  }

  async ensureChannelAccount(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.channelAccount.count({ where: { id, orgId, isActive: true } });
    if (!exists) throw new BadRequestException('Channel account does not belong to organization');
  }

  async ensureEntity(orgId: string, entityType: EntityType, entityId?: string | null) {
    if (!entityId) return;
    switch (entityType) {
      case EntityType.LEAD:
        return this.ensureLead(orgId, entityId);
      case EntityType.CONTACT:
        return this.ensureContact(orgId, entityId);
      case EntityType.COMPANY:
        return this.ensureCompany(orgId, entityId);
      case EntityType.DEAL:
        return this.ensureDeal(orgId, entityId);
      case EntityType.TASK:
        return this.ensureTask(orgId, entityId);
      case EntityType.PROJECT:
        return this.ensureProject(orgId, entityId);
      case EntityType.CAMPAIGN:
        return this.ensureCampaign(orgId, entityId);
      case EntityType.CONVERSATION:
        return this.ensureConversation(orgId, entityId);
      default:
        throw new NotFoundException('Entity not found in organization');
    }
  }

  async ensureTask(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.task.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Task does not belong to organization');
  }

  async ensureCampaign(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.campaign.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Campaign does not belong to organization');
  }

  async ensureConversation(orgId: string, id?: string | null) {
    if (!id) return;
    const exists = await this.prisma.conversation.count({ where: { id, orgId, deletedAt: null } });
    if (!exists) throw new BadRequestException('Conversation does not belong to organization');
  }
}
