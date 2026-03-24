import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('users:create')
  @ApiOperation({ summary: 'Create a new user (invite)' })
  create(
    @OrgId() orgId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.create(orgId, dto, actorId);
  }

  @Get()
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'List all users in organization' })
  findAll(@OrgId() orgId: string, @Query() query: PaginationDto) {
    return this.usersService.findAll(orgId, query);
  }

  @Get(':id')
  @RequirePermissions('users:read')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.usersService.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions('users:update')
  @ApiOperation({ summary: 'Update user profile' })
  update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.update(orgId, id, dto, actorId);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate user' })
  deactivate(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.deactivate(orgId, id, actorId);
  }

  @Delete(':id')
  @RequirePermissions('users:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete user' })
  remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.usersService.remove(orgId, id, actorId);
  }
}
