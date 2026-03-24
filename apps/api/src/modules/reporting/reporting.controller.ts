import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('reporting')
@ApiBearerAuth()
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('dashboard')
  getDashboard(@OrgId() orgId: string) {
    return this.reportingService.getDashboard(orgId);
  }

  @Get('sales-funnel')
  getSalesFunnel(@OrgId() orgId: string, @Query('pipelineId') pipelineId?: string) {
    return this.reportingService.getSalesFunnel(orgId, pipelineId);
  }

  @Get('leads-by-source')
  getLeadsBySource(@OrgId() orgId: string) {
    return this.reportingService.getLeadsBySource(orgId);
  }

  @Get('activities-timeline')
  getActivitiesTimeline(@OrgId() orgId: string, @Query('days') days?: string) {
    return this.reportingService.getActivitiesTimeline(orgId, days ? parseInt(days) : 30);
  }

  @Get('campaign-stats')
  getCampaignStats(@OrgId() orgId: string) {
    return this.reportingService.getCampaignStats(orgId);
  }
}
