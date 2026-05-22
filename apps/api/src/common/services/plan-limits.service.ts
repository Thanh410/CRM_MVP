import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type LimitedResource = 'users' | 'leads' | 'contacts' | 'companies' | 'deals' | 'campaigns';

const PLAN_LIMITS: Record<string, Record<LimitedResource, number>> = {
  free: {
    users: 5,
    leads: 500,
    contacts: 500,
    companies: 100,
    deals: 200,
    campaigns: 5,
  },
  pro: {
    users: 50,
    leads: 50000,
    contacts: 50000,
    companies: 10000,
    deals: 20000,
    campaigns: 200,
  },
  enterprise: {
    users: Number.POSITIVE_INFINITY,
    leads: Number.POSITIVE_INFINITY,
    contacts: Number.POSITIVE_INFINITY,
    companies: Number.POSITIVE_INFINITY,
    deals: Number.POSITIVE_INFINITY,
    campaigns: Number.POSITIVE_INFINITY,
  },
};

@Injectable()
export class PlanLimitsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanCreate(orgId: string, resource: LimitedResource) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { plan: true },
    });
    const plan = org?.plan ?? 'free';
    const limit = PLAN_LIMITS[plan]?.[resource] ?? PLAN_LIMITS.free[resource];
    if (!Number.isFinite(limit)) return;

    const current = await this.countResource(orgId, resource);
    if (current >= limit) {
      throw new ForbiddenException(`Plan limit reached for ${resource}`);
    }
  }

  private countResource(orgId: string, resource: LimitedResource) {
    const where = { orgId, deletedAt: null };
    switch (resource) {
      case 'users':
        return this.prisma.user.count({ where });
      case 'leads':
        return this.prisma.lead.count({ where });
      case 'contacts':
        return this.prisma.contact.count({ where });
      case 'companies':
        return this.prisma.company.count({ where });
      case 'deals':
        return this.prisma.deal.count({ where });
      case 'campaigns':
        return this.prisma.campaign.count({ where });
    }
  }
}
