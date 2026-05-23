import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { SearchScope } from './dto/search-query.dto';

export type SearchResultType =
  | 'lead'
  | 'contact'
  | 'company'
  | 'deal'
  | 'project'
  | 'task'
  | 'user'
  | 'audit'
  | 'chat'
  | 'inbox'
  | 'setting';

export interface SearchResultItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  status?: string;
  updatedAt?: string;
}

export interface SearchResultGroup {
  key: string;
  label: string;
  items: SearchResultItem[];
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(orgId: string, query: { q?: string; scope?: SearchScope; limit?: number }) {
    const q = query.q?.trim() ?? '';
    const scope = query.scope ?? 'all';
    const limit = Math.min(Math.max(query.limit ?? 5, 1), 10);

    const groups = q
      ? await this.searchRecords(orgId, q, scope, limit)
      : this.staticGroups(scope);

    return { groups: groups.filter((group) => group.items.length > 0) };
  }

  private async searchRecords(orgId: string, q: string, scope: SearchScope, limit: number): Promise<SearchResultGroup[]> {
    const includeCrm = scope === 'all' || scope === 'crm';
    const includeWork = scope === 'all' || scope === 'work';
    const includeConnect = scope === 'all' || scope === 'connect';
    const includeManage = scope === 'all' || scope === 'manage';
    const contains = { contains: q, mode: 'insensitive' as const };

    const [
      leads,
      contacts,
      companies,
      deals,
      projects,
      tasks,
      users,
      conversations,
      auditLogs,
    ] = await Promise.all([
      includeCrm
        ? this.prisma.lead.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ fullName: contains }, { email: contains }, { phone: contains }],
            },
            select: { id: true, fullName: true, email: true, phone: true, status: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeCrm
        ? this.prisma.contact.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ fullName: contains }, { email: contains }, { phone: { contains: q } }],
            },
            select: { id: true, fullName: true, email: true, phone: true, updatedAt: true, company: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeCrm
        ? this.prisma.company.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ name: contains }, { industry: contains }, { email: contains }],
            },
            select: { id: true, name: true, industry: true, email: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeCrm
        ? this.prisma.deal.findMany({
            where: { orgId, deletedAt: null, title: contains },
            select: { id: true, title: true, status: true, value: true, updatedAt: true, company: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeWork
        ? this.prisma.project.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ name: contains }, { description: contains }],
            },
            select: { id: true, name: true, status: true, updatedAt: true, dept: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeWork
        ? this.prisma.task.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ title: contains }, { description: contains }],
            },
            select: { id: true, title: true, status: true, priority: true, updatedAt: true, project: { select: { name: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeManage
        ? this.prisma.user.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [{ fullName: contains }, { email: contains }],
            },
            select: { id: true, fullName: true, email: true, status: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeConnect
        ? this.prisma.conversation.findMany({
            where: {
              orgId,
              deletedAt: null,
              OR: [
                { subject: contains },
                { externalId: contains },
                { contact: { is: { fullName: contains } } },
                { messages: { some: { content: contains } } },
              ],
            },
            select: { id: true, kind: true, channel: true, subject: true, status: true, updatedAt: true, contact: { select: { fullName: true } } },
            orderBy: { updatedAt: 'desc' },
            take: limit,
          })
        : [],
      includeManage
        ? this.prisma.auditLog.findMany({
            where: {
              orgId,
              resource: contains,
            },
            select: { id: true, action: true, resource: true, createdAt: true, user: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : [],
    ]);

    return [
      {
        key: 'leads',
        label: 'Leads',
        items: leads.map((lead) => ({
          id: lead.id,
          type: 'lead' as const,
          title: lead.fullName,
          subtitle: lead.email ?? lead.phone ?? undefined,
          href: `/leads?q=${encodeURIComponent(lead.fullName)}`,
          status: lead.status,
          updatedAt: lead.updatedAt.toISOString(),
        })),
      },
      {
        key: 'contacts',
        label: 'Liên hệ',
        items: contacts.map((contact) => ({
          id: contact.id,
          type: 'contact' as const,
          title: contact.fullName,
          subtitle: contact.company?.name ?? contact.email ?? contact.phone ?? undefined,
          href: `/contacts?q=${encodeURIComponent(contact.fullName)}`,
          updatedAt: contact.updatedAt.toISOString(),
        })),
      },
      {
        key: 'companies',
        label: 'Công ty',
        items: companies.map((company) => ({
          id: company.id,
          type: 'company' as const,
          title: company.name,
          subtitle: company.industry ?? company.email ?? undefined,
          href: `/companies?q=${encodeURIComponent(company.name)}`,
          updatedAt: company.updatedAt.toISOString(),
        })),
      },
      {
        key: 'deals',
        label: 'Cơ hội',
        items: deals.map((deal) => ({
          id: deal.id,
          type: 'deal' as const,
          title: deal.title,
          subtitle: deal.company?.name ?? undefined,
          href: `/deals?q=${encodeURIComponent(deal.title)}`,
          status: deal.status,
          updatedAt: deal.updatedAt.toISOString(),
        })),
      },
      {
        key: 'projects',
        label: 'Dự án',
        items: projects.map((project) => ({
          id: project.id,
          type: 'project' as const,
          title: project.name,
          subtitle: project.dept?.name ?? undefined,
          href: `/projects?q=${encodeURIComponent(project.name)}`,
          status: project.status,
          updatedAt: project.updatedAt.toISOString(),
        })),
      },
      {
        key: 'tasks',
        label: 'Nhiệm vụ',
        items: tasks.map((task) => ({
          id: task.id,
          type: 'task' as const,
          title: task.title,
          subtitle: task.project?.name ?? task.priority,
          href: `/tasks?q=${encodeURIComponent(task.title)}`,
          status: task.status,
          updatedAt: task.updatedAt.toISOString(),
        })),
      },
      {
        key: 'connect',
        label: 'Kết nối',
        items: conversations.map((conversation) => ({
          id: conversation.id,
          type: conversation.kind === 'DIRECT' || conversation.kind === 'GROUP' ? ('chat' as const) : ('inbox' as const),
          title: conversation.subject ?? conversation.contact?.fullName ?? conversation.channel,
          subtitle: conversation.channel,
          href: conversation.kind === 'DIRECT' || conversation.kind === 'GROUP' ? '/chat' : '/inbox',
          status: conversation.status,
          updatedAt: conversation.updatedAt.toISOString(),
        })),
      },
      {
        key: 'users',
        label: 'Nhân sự',
        items: users.map((user) => ({
          id: user.id,
          type: 'user' as const,
          title: user.fullName,
          subtitle: user.email,
          href: `/users?q=${encodeURIComponent(user.fullName)}`,
          status: user.status,
          updatedAt: user.updatedAt.toISOString(),
        })),
      },
      {
        key: 'audit',
        label: 'Nhật ký',
        items: auditLogs.map((log) => ({
          id: log.id,
          type: 'audit' as const,
          title: `${log.action} ${log.resource}`,
          subtitle: log.user?.fullName ?? undefined,
          href: `/audit?q=${encodeURIComponent(log.action)}`,
          updatedAt: log.createdAt.toISOString(),
        })),
      },
    ];
  }

  private staticGroups(scope: SearchScope): SearchResultGroup[] {
    const settings = [
      { id: 'settings-org', type: 'setting' as const, title: 'Tổ chức', subtitle: 'Thông tin công ty', href: '/settings?section=org' },
      { id: 'settings-depts', type: 'setting' as const, title: 'Phòng ban', subtitle: 'Cơ cấu tổ chức', href: '/settings?section=depts' },
      { id: 'settings-rbac', type: 'setting' as const, title: 'Phân quyền', subtitle: 'Vai trò và quyền truy cập', href: '/settings?section=rbac' },
      { id: 'settings-integrations', type: 'setting' as const, title: 'Tích hợp', subtitle: 'Zalo, Messenger', href: '/settings?section=integrations' },
    ];

    if (scope !== 'all' && scope !== 'manage') return [];
    return [{ key: 'settings', label: 'Cài đặt', items: settings }];
  }
}
