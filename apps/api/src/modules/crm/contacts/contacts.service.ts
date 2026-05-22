import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantScopeService } from '../../../common/services/tenant-scope.service';
import { PlanLimitsService } from '../../../common/services/plan-limits.service';
import { PaginationDto, paginate } from '../../../common/dto/pagination.dto';
import type { BulkDeleteResult } from '../../../common/dto/bulk-delete.dto';

const CONTACT_SELECT = {
  id: true, orgId: true, fullName: true, email: true, phone: true, mobile: true,
  gender: true, dateOfBirth: true, address: true, jobTitle: true,
  companyId: true, assignedTo: true, description: true, createdAt: true, updatedAt: true,
  company: { select: { id: true, name: true } },
  assignee: { select: { id: true, fullName: true, avatar: true } },
};

export interface CreateContactDto {
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  companyId?: string;
  jobTitle?: string;
  assignedTo?: string;
  description?: string;
}

@Injectable()
export class ContactsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private tenantScope: TenantScopeService,
    private planLimits: PlanLimitsService,
  ) {}

  async create(orgId: string, dto: CreateContactDto, createdBy?: string) {
    await this.validateRefs(orgId, dto);
    await this.planLimits.assertCanCreate(orgId, 'contacts');
    const contact = await this.prisma.contact.create({
      data: { orgId, createdBy, ...dto } as any,
      select: CONTACT_SELECT,
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: createdBy, action: 'CREATE', resource: 'contacts', resourceId: contact.id,
    });

    return contact;
  }

  async findAll(orgId: string, query: PaginationDto & { companyId?: string; assignedTo?: string }) {
    const where: any = {
      orgId, deletedAt: null,
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.contact.findMany({
        where, select: CONTACT_SELECT,
        orderBy: { createdAt: 'desc' },
        ...(query.all ? {} : { skip: query.skip, take: query.limit }),
      }),
      this.prisma.contact.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(orgId: string, id: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        company: { select: { id: true, name: true, industry: true } },
        assignee: { select: { id: true, fullName: true, avatar: true } },
        deals: {
          where: { deletedAt: null },
          include: { stage: { select: { id: true, name: true, color: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  async update(orgId: string, id: string, dto: Partial<CreateContactDto>, updatedBy?: string) {
    await this.findOneSimple(orgId, id);
    await this.validateRefs(orgId, dto);
    await this.prisma.contact.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { ...dto, updatedBy } as any,
    });
    return this.findOneSimple(orgId, id);
  }

  async remove(orgId: string, id: string, actorId?: string) {
    await this.findOneSimple(orgId, id);
    await this.prisma.contact.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    this.eventEmitter.emit('audit.create', {
      orgId, userId: actorId, action: 'DELETE', resource: 'contacts', resourceId: id,
    });
  }

  async bulkRemove(orgId: string, ids: string[], actorId?: string): Promise<BulkDeleteResult> {
    const uniqueIds = [...new Set(ids)];
    const existing = await this.prisma.contact.findMany({
      where: { id: { in: uniqueIds }, orgId, deletedAt: null },
      select: { id: true },
    });
    const deletedIds = existing.map((contact) => contact.id);

    if (deletedIds.length > 0) {
      await this.prisma.contact.updateMany({
        where: { id: { in: deletedIds }, orgId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      for (const id of deletedIds) {
        this.eventEmitter.emit('audit.create', {
          orgId, userId: actorId, action: 'DELETE', resource: 'contacts', resourceId: id,
        });
      }
    }

    return {
      deletedIds,
      failedIds: uniqueIds.filter((id) => !deletedIds.includes(id)),
      count: deletedIds.length,
    };
  }

  private async findOneSimple(orgId: string, id: string) {
    const c = await this.prisma.contact.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!c) throw new NotFoundException('Contact not found');
    return c;
  }

  private async validateRefs(orgId: string, dto: Partial<CreateContactDto>) {
    await this.tenantScope.ensureCompany(orgId, dto.companyId);
    await this.tenantScope.ensureUser(orgId, dto.assignedTo);
  }
}
