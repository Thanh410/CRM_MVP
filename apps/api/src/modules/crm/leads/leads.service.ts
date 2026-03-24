import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Readable } from 'stream';
import { stringify } from 'csv-stringify';
import { parse } from 'csv-parse';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { paginate } from '../../../common/dto/pagination.dto';

const LEAD_SELECT = {
  id: true, orgId: true, fullName: true, email: true, phone: true,
  status: true, source: true, utmSource: true, utmMedium: true, utmCampaign: true,
  description: true, assignedTo: true, convertedContactId: true, convertedAt: true,
  createdBy: true, createdAt: true, updatedAt: true,
  assignee: { select: { id: true, fullName: true, avatar: true } },
};

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(orgId: string, dto: CreateLeadDto, createdBy?: string) {
    const lead = await this.prisma.lead.create({
      data: { orgId, createdBy, ...dto },
      select: LEAD_SELECT,
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: createdBy, action: 'CREATE', resource: 'leads', resourceId: lead.id,
    });

    return lead;
  }

  async findAll(orgId: string, query: QueryLeadDto) {
    const where: any = {
      orgId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.assignedTo ? { assignedTo: query.assignedTo } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const orderBy = query.sortBy
      ? { [query.sortBy]: query.sortOrder ?? 'desc' }
      : { createdAt: 'desc' as const };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where, select: LEAD_SELECT, orderBy, skip: query.skip, take: query.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return paginate(data, total, query);
  }

  async findOne(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        assignee: { select: { id: true, fullName: true, avatar: true } },
        tasks: {
          where: { deletedAt: null },
          orderBy: { dueDate: 'asc' },
          include: { assignee: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(orgId: string, id: string, dto: UpdateLeadDto, updatedBy?: string) {
    await this.findOneSimple(orgId, id);

    const lead = await this.prisma.lead.update({
      where: { id },
      data: { ...dto, updatedBy },
      select: LEAD_SELECT,
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: updatedBy, action: 'UPDATE', resource: 'leads', resourceId: id,
    });

    return lead;
  }

  async assign(orgId: string, id: string, assignedTo: string, actorId?: string) {
    await this.findOneSimple(orgId, id);

    const user = await this.prisma.user.findFirst({ where: { id: assignedTo, orgId } });
    if (!user) throw new BadRequestException('Assignee not found in organization');

    return this.prisma.lead.update({
      where: { id },
      data: { assignedTo, updatedBy: actorId },
      select: LEAD_SELECT,
    });
  }

  async convert(orgId: string, id: string, actorId?: string) {
    const lead = await this.findOneSimple(orgId, id);

    if (lead.convertedContactId) {
      throw new ConflictException('Lead already converted');
    }

    // Create contact from lead
    const contact = await this.prisma.contact.create({
      data: {
        orgId,
        fullName: lead.fullName,
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        assignedTo: lead.assignedTo ?? undefined,
        createdBy: actorId,
      },
    });

    await this.prisma.lead.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedContactId: contact.id,
        convertedAt: new Date(),
        updatedBy: actorId,
      },
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: actorId, action: 'UPDATE', resource: 'leads', resourceId: id,
      changes: { action: 'converted', contactId: contact.id },
    });

    return { lead: id, contact };
  }

  async remove(orgId: string, id: string, actorId?: string) {
    await this.findOneSimple(orgId, id);

    await this.prisma.lead.update({
      where: { id }, data: { deletedAt: new Date(), updatedBy: actorId },
    });

    this.eventEmitter.emit('audit.create', {
      orgId, userId: actorId, action: 'DELETE', resource: 'leads', resourceId: id,
    });
  }

  // ── CSV Export ────────────────────────────────────────────

  async exportCsv(orgId: string): Promise<Buffer> {
    const leads = await this.prisma.lead.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return new Promise((resolve, reject) => {
      const rows = leads.map((l) => ({
        'Họ tên': l.fullName,
        'Email': l.email ?? '',
        'Điện thoại': l.phone ?? '',
        'Trạng thái': l.status,
        'Nguồn': l.source ?? '',
        'UTM Source': l.utmSource ?? '',
        'UTM Campaign': l.utmCampaign ?? '',
        'Mô tả': l.description ?? '',
        'Ngày tạo': l.createdAt.toISOString(),
      }));

      stringify(rows, { header: true, bom: true }, (err, output) => {
        if (err) reject(err);
        else resolve(Buffer.from(output, 'utf-8'));
      });
    });
  }

  // ── CSV Import ─────────────────────────────────────────────

  async importCsv(orgId: string, buffer: Buffer, createdBy?: string) {
    const records: any[] = await new Promise((resolve, reject) => {
      parse(buffer, { columns: true, skip_empty_lines: true, bom: true }, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    let created = 0;
    const rowErrors: { row: number; message: string }[] = [];

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const PHONE_REGEX = /^[\d\s\-\+\(\)]{7,20}$/;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const fullName = row['Họ tên'] || row['fullName'] || row['name'];
      if (!fullName || !fullName.trim()) {
        rowErrors.push({ row: i + 2, message: 'Thiếu họ tên' });
        continue;
      }

      const email = row['Email'] || row['email'] || undefined;
      if (email && !EMAIL_REGEX.test(email.trim())) {
        rowErrors.push({ row: i + 2, message: `Email không hợp lệ: ${email}` });
        continue;
      }

      const phone = row['Điện thoại'] || row['phone'] || undefined;
      if (phone && !PHONE_REGEX.test(phone.trim())) {
        rowErrors.push({ row: i + 2, message: `Số điện thoại không hợp lệ: ${phone}` });
        continue;
      }

      try {
        await this.prisma.lead.create({
          data: {
            orgId,
            createdBy,
            fullName: fullName.trim(),
            email: email?.trim() || undefined,
            phone: phone?.trim() || undefined,
            source: row['Nguồn'] || row['source'] || undefined,
            description: row['Mô tả'] || row['description'] || undefined,
          },
        });
        created++;
      } catch {
        rowErrors.push({ row: i + 2, message: 'Lỗi tạo bản ghi' });
      }
    }

    return { total: records.length, created, errors: rowErrors.length, rowErrors };
  }

  // ── Helpers ───────────────────────────────────────────────

  private async findOneSimple(orgId: string, id: string) {
    const lead = await this.prisma.lead.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }
}
