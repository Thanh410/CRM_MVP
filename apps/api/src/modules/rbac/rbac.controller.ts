import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('RBAC')
@ApiBearerAuth('access-token')
@Controller('rbac')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @ApiOperation({ summary: 'List all roles with permissions' })
  getRoles(@OrgId() orgId: string) {
    return this.rbacService.getRoles(orgId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'List all available permissions' })
  getPermissions() {
    return this.rbacService.getPermissions();
  }

  @Post('users/:userId/roles/:roleId')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Assign role to user' })
  assignRole(
    @OrgId() orgId: string,
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rbacService.assignRoleToUser(orgId, userId, roleId);
  }

  @Delete('users/:userId/roles/:roleId')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Remove role from user' })
  removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.rbacService.removeRoleFromUser(userId, roleId);
  }

  @Put('roles/:roleId/permissions')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update role permissions' })
  updateRolePermissions(
    @OrgId() orgId: string,
    @Param('roleId') roleId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.rbacService.updateRolePermissions(orgId, roleId, body.permissionIds);
  }
}
