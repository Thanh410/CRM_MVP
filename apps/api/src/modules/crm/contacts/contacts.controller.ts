import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly svc: ContactsService) {}

  @Post()
  @RequirePermissions('contacts:create')
  @ApiOperation({ summary: 'Create contact' })
  create(@OrgId() orgId: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.create(orgId, dto, actor);
  }

  @Get()
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'List contacts' })
  findAll(@OrgId() orgId: string, @Query() query: PaginationDto) {
    return this.svc.findAll(orgId, query);
  }

  @Get(':id')
  @RequirePermissions('contacts:read')
  @ApiOperation({ summary: 'Get contact detail with timeline' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions('contacts:update')
  @ApiOperation({ summary: 'Update contact' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.update(orgId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('contacts:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete contact' })
  remove(@OrgId() orgId: string, @Param('id') id: string, @CurrentUser('id') actor: string) {
    return this.svc.remove(orgId, id, actor);
  }
}
