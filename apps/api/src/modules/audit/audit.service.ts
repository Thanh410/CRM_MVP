import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';

export interface AuditCreateEvent {
  orgId: string;
  userId?: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  changes?: object;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  @OnEvent('audit.create')
  async handleAuditCreate(event: AuditCreateEvent) {
    await this.prisma.auditLog.create({
      data: {
        orgId: event.orgId,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        changes: event.changes ?? undefined,
        ip: event.ip,
        userAgent: event.userAgent,
      },
    });
  }

  async findAll(orgId: string, query: PaginationDto & { resource?: string; userId?: string }) {
    const where = {
      orgId,
      ...(query.resource ? { resource: query.resource } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return paginate(data, total, query);
  }
}
