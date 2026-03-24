import { Controller, Get, Patch, Post, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Organizations')
@ApiBearerAuth('access-token')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly svc: OrganizationsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current organization' })
  getOrg(@OrgId() orgId: string) {
    return this.svc.getOrg(orgId);
  }

  @Patch('me')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Update organization settings' })
  updateOrg(@OrgId() orgId: string, @Body() body: any) {
    return this.svc.updateOrg(orgId, body);
  }

  // Departments
  @Get('departments')
  @ApiOperation({ summary: 'List departments' })
  getDepts(@OrgId() orgId: string) {
    return this.svc.getDepartments(orgId);
  }

  @Post('departments')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Create department' })
  createDept(@OrgId() orgId: string, @Body() body: any) {
    return this.svc.createDepartment(orgId, body);
  }

  @Patch('departments/:id')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Update department' })
  updateDept(@OrgId() orgId: string, @Param('id') id: string, @Body() body: any) {
    return this.svc.updateDepartment(orgId, id, body);
  }

  @Delete('departments/:id')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Delete department' })
  removeDept(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.removeDepartment(orgId, id);
  }

  // Teams
  @Get('teams')
  @ApiOperation({ summary: 'List teams' })
  getTeams(@OrgId() orgId: string) {
    return this.svc.getTeams(orgId);
  }

  @Post('teams')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Create team' })
  createTeam(@OrgId() orgId: string, @Body() body: any) {
    return this.svc.createTeam(orgId, body);
  }

  @Delete('teams/:id')
  @RequirePermissions('organization:update')
  @ApiOperation({ summary: 'Delete team' })
  removeTeam(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.removeTeam(orgId, id);
  }
}
