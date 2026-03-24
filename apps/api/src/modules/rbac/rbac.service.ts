import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export const DEFAULT_PERMISSIONS = [
  // Users
  { resource: 'users', action: 'create' },
  { resource: 'users', action: 'read' },
  { resource: 'users', action: 'update' },
  { resource: 'users', action: 'delete' },
  // Organization
  { resource: 'organization', action: 'update' },
  // Leads
  { resource: 'leads', action: 'create' },
  { resource: 'leads', action: 'read' },
  { resource: 'leads', action: 'update' },
  { resource: 'leads', action: 'delete' },
  { resource: 'leads', action: 'assign' },
  { resource: 'leads', action: 'export' },
  // Contacts
  { resource: 'contacts', action: 'create' },
  { resource: 'contacts', action: 'read' },
  { resource: 'contacts', action: 'update' },
  { resource: 'contacts', action: 'delete' },
  { resource: 'contacts', action: 'export' },
  // Companies
  { resource: 'companies', action: 'create' },
  { resource: 'companies', action: 'read' },
  { resource: 'companies', action: 'update' },
  { resource: 'companies', action: 'delete' },
  // Deals
  { resource: 'deals', action: 'create' },
  { resource: 'deals', action: 'read' },
  { resource: 'deals', action: 'update' },
  { resource: 'deals', action: 'delete' },
  { resource: 'deals', action: 'assign' },
  // Tasks
  { resource: 'tasks', action: 'create' },
  { resource: 'tasks', action: 'read' },
  { resource: 'tasks', action: 'update' },
  { resource: 'tasks', action: 'delete' },
  { resource: 'tasks', action: 'assign' },
  // Projects
  { resource: 'projects', action: 'create' },
  { resource: 'projects', action: 'read' },
  { resource: 'projects', action: 'update' },
  { resource: 'projects', action: 'delete' },
  // Campaigns (marketing)
  { resource: 'campaigns', action: 'create' },
  { resource: 'campaigns', action: 'read' },
  { resource: 'campaigns', action: 'update' },
  { resource: 'campaigns', action: 'delete' },
  // Conversations (chat)
  { resource: 'conversations', action: 'read' },
  { resource: 'conversations', action: 'assign' },
  { resource: 'conversations', action: 'reply' },
  // Reports
  { resource: 'reports', action: 'read' },
  // Audit
  { resource: 'audit', action: 'read' },
  // Integrations
  { resource: 'integrations', action: 'manage' },
  // Pipelines / Settings
  { resource: 'pipelines', action: 'manage' },
  { resource: 'custom_fields', action: 'manage' },
];

// Which permissions each role gets by default
export const ROLE_DEFAULTS: Record<string, string[]> = {
  SUPER_ADMIN: ['*'], // all
  ADMIN: ['*'],
  MANAGER: [
    'users:read', 'leads:*', 'contacts:*', 'companies:*', 'deals:*',
    'tasks:*', 'projects:*', 'campaigns:read', 'conversations:*', 'reports:read',
  ],
  SALES: [
    'leads:create', 'leads:read', 'leads:update', 'leads:assign',
    'contacts:create', 'contacts:read', 'contacts:update',
    'companies:read', 'companies:create', 'companies:update',
    'deals:create', 'deals:read', 'deals:update',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:assign',
  ],
  MARKETING: [
    'leads:read', 'contacts:read', 'campaigns:*', 'reports:read',
  ],
  SUPPORT: [
    'contacts:read', 'conversations:read', 'conversations:reply', 'conversations:assign',
    'tasks:create', 'tasks:read', 'tasks:update',
  ],
  STAFF: [
    'leads:read', 'contacts:read', 'tasks:read', 'tasks:update',
  ],
};

@Injectable()
export class RbacService {
  constructor(private prisma: PrismaService) {}

  async getRoles(orgId: string) {
    return this.prisma.role.findMany({
      where: { orgId },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  async assignRoleToUser(orgId: string, userId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, orgId } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId, orgId },
      update: {},
    });
  }

  async removeRoleFromUser(userId: string, roleId: string) {
    await this.prisma.userRole.delete({
      where: { userId_roleId: { userId, roleId } },
    });
  }

  async updateRolePermissions(orgId: string, roleId: string, permissionIds: string[]) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, orgId } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
        skipDuplicates: true,
      }),
    ]);

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  // Called during org seeding to set up default roles + permissions
  async seedDefaultRolesAndPermissions(orgId: string) {
    // 1. Upsert all permissions
    for (const perm of DEFAULT_PERMISSIONS) {
      await this.prisma.permission.upsert({
        where: { resource_action: { resource: perm.resource, action: perm.action } },
        create: perm,
        update: {},
      });
    }

    const allPerms = await this.prisma.permission.findMany();
    const permMap = new Map(allPerms.map((p) => [`${p.resource}:${p.action}`, p.id]));

    // 2. Create roles for this org
    const roleNames: Array<{ name: any; displayName: string }> = [
      { name: 'SUPER_ADMIN', displayName: 'Super Admin' },
      { name: 'ADMIN', displayName: 'Admin' },
      { name: 'MANAGER', displayName: 'Quản lý' },
      { name: 'SALES', displayName: 'Kinh doanh' },
      { name: 'MARKETING', displayName: 'Marketing' },
      { name: 'SUPPORT', displayName: 'CSKH / Hỗ trợ' },
      { name: 'STAFF', displayName: 'Nhân viên' },
    ];

    for (const roleData of roleNames) {
      const existing = await this.prisma.role.findFirst({ where: { orgId, name: roleData.name } });

      let role = existing;
      if (!role) {
        role = await this.prisma.role.create({
          data: { orgId, name: roleData.name, displayName: roleData.displayName },
        });
      }

      // Assign permissions
      const defaults = ROLE_DEFAULTS[roleData.name] ?? [];
      const isFullAccess = defaults.includes('*');

      const permIds = isFullAccess
        ? allPerms.map((p) => p.id)
        : defaults
            .flatMap((pattern) => {
              if (pattern.endsWith(':*')) {
                const resource = pattern.slice(0, -2);
                return allPerms.filter((p) => p.resource === resource).map((p) => p.id);
              }
              return permMap.has(pattern) ? [permMap.get(pattern)!] : [];
            });

      await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permIds.length > 0) {
        await this.prisma.rolePermission.createMany({
          data: permIds.map((permissionId) => ({ roleId: role!.id, permissionId })),
          skipDuplicates: true,
        });
      }
    }
  }
}
