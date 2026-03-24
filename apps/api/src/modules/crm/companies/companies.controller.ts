import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Companies')
@ApiBearerAuth('access-token')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @Post()
  @RequirePermissions('companies:create')
  create(@OrgId() orgId: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.create(orgId, dto, actor);
  }

  @Get()
  @RequirePermissions('companies:read')
  findAll(@OrgId() orgId: string, @Query() query: PaginationDto) {
    return this.svc.findAll(orgId, query);
  }

  @Get(':id')
  @RequirePermissions('companies:read')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions('companies:update')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: any, @CurrentUser('id') actor: string) {
    return this.svc.update(orgId, id, dto, actor);
  }

  @Delete(':id')
  @RequirePermissions('companies:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@OrgId() orgId: string, @Param('id') id: string, @CurrentUser('id') actor: string) {
    return this.svc.remove(orgId, id, actor);
  }
}
