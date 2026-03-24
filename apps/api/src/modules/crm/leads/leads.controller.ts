import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  HttpCode, HttpStatus, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgId } from '../../../common/decorators/org-id.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';

@ApiTags('Leads')
@ApiBearerAuth('access-token')
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @RequirePermissions('leads:create')
  @ApiOperation({ summary: 'Create lead' })
  create(
    @OrgId() orgId: string,
    @Body() dto: CreateLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.create(orgId, dto, actorId);
  }

  @Get()
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'List leads with filter/search/pagination' })
  findAll(@OrgId() orgId: string, @Query() query: QueryLeadDto) {
    return this.leadsService.findAll(orgId, query);
  }

  @Get('export/csv')
  @RequirePermissions('leads:export')
  @ApiOperation({ summary: 'Export leads to CSV' })
  async exportCsv(@OrgId() orgId: string, @Res() res: Response) {
    const buffer = await this.leadsService.exportCsv(orgId);
    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.end(buffer);
  }

  @Post('import/csv')
  @RequirePermissions('leads:create')
  @ApiOperation({ summary: 'Import leads from CSV' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  importCsv(
    @OrgId() orgId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.importCsv(orgId, file.buffer, actorId);
  }

  @Get(':id')
  @RequirePermissions('leads:read')
  @ApiOperation({ summary: 'Get lead detail with timeline' })
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.leadsService.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermissions('leads:update')
  @ApiOperation({ summary: 'Update lead' })
  update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.update(orgId, id, dto, actorId);
  }

  @Patch(':id/assign')
  @RequirePermissions('leads:assign')
  @ApiOperation({ summary: 'Assign lead to user' })
  assign(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.assign(orgId, id, body.assignedTo, actorId);
  }

  @Post(':id/convert')
  @RequirePermissions('leads:update')
  @ApiOperation({ summary: 'Convert lead to contact' })
  convert(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.convert(orgId, id, actorId);
  }

  @Delete(':id')
  @RequirePermissions('leads:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete lead' })
  remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.leadsService.remove(orgId, id, actorId);
  }
}
