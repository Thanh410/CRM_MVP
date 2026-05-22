import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async getOrg(orgId: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      include: {
        departments: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        teams: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async updateOrg(orgId: string, data: { name?: string; website?: string; address?: string; phone?: string; email?: string; logo?: string }) {
    await this.prisma.organization.updateMany({
      where: { id: orgId, deletedAt: null },
      data,
    });
    return this.getOrg(orgId);
  }

  // Departments
  async createDepartment(orgId: string, data: { name: string; description?: string; parentId?: string }) {
    await this.tenantScope.ensureDepartment(orgId, data.parentId);
    return this.prisma.department.create({
      data: { orgId, ...data },
    });
  }

  async getDepartments(orgId: string) {
    return this.prisma.department.findMany({
      where: { orgId, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
      orderBy: { name: 'asc' },
    });
  }

  async updateDepartment(orgId: string, id: string, data: { name?: string; description?: string; parentId?: string }) {
    await this.findDept(orgId, id);
    await this.tenantScope.ensureDepartment(orgId, data.parentId);
    await this.prisma.department.updateMany({ where: { id, orgId, deletedAt: null }, data });
    return this.findDept(orgId, id);
  }

  async removeDepartment(orgId: string, id: string) {
    await this.findDept(orgId, id);
    await this.prisma.department.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  // Teams
  async createTeam(orgId: string, data: { name: string; description?: string; deptId?: string }) {
    await this.tenantScope.ensureDepartment(orgId, data.deptId);
    return this.prisma.team.create({ data: { orgId, ...data } });
  }

  async getTeams(orgId: string) {
    return this.prisma.team.findMany({
      where: { orgId, deletedAt: null },
      include: { dept: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async removeTeam(orgId: string, id: string) {
    const result = await this.prisma.team.updateMany({
      where: { id, orgId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('Team not found');
  }

  private async findDept(orgId: string, id: string) {
    const dept = await this.prisma.department.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}
