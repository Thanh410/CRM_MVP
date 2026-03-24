import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaginationDto, paginate } from '../../../common/dto/pagination.dto';

const COMPANY_SELECT = {
  id: true, orgId: true, name: true, industry: true, size: true,
  website: true, address: true, phone: true, email: true, taxCode: true,
  description: true, createdAt: true, updatedAt: true,
  _count: { select: { contacts: true, deals: true } },
};

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService, private eventEmitter: EventEmitter2) {}

  async create(orgId: string, dto: any, createdBy?: string) {
    const company = await this.prisma.company.create({
      data: { orgId, createdBy, ...dto },
      select: COMPANY_SELECT,
    });
    this.eventEmitter.emit('audit.create', {
      orgId, userId: createdBy, action: 'CREATE', resource: 'companies', resourceId: company.id,
    });
    return company;
  }

  async findAll(orgId: string, query: PaginationDto) {
    const where: any = {
      orgId, deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { industry: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where, select: COMPANY_SELECT,
        orderBy: { name: 'asc' }, skip: query.skip, take: query.limit,
      }),
      this.prisma.company.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(orgId: string, id: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        contacts: { where: { deletedAt: null }, select: { id: true, fullName: true, email: true, phone: true, jobTitle: true } },
        deals: { where: { deletedAt: null }, include: { stage: { select: { id: true, name: true, color: true } } }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(orgId: string, id: string, dto: any, updatedBy?: string) {
    await this.findOneSimple(orgId, id);
    return this.prisma.company.update({ where: { id }, data: { ...dto, updatedBy }, select: COMPANY_SELECT });
  }

  async remove(orgId: string, id: string, actorId?: string) {
    await this.findOneSimple(orgId, id);
    await this.prisma.company.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  private async findOneSimple(orgId: string, id: string) {
    const c = await this.prisma.company.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!c) throw new NotFoundException('Company not found');
    return c;
  }
}
