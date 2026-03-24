import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { CreateCampaignDto, CreateTemplateDto } from './dto/create-campaign.dto';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // Templates
  @Get('templates')
  findAllTemplates(@OrgId() orgId: string) {
    return this.marketingService.findAllTemplates(orgId);
  }

  @Post('templates')
  createTemplate(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateTemplateDto) {
    return this.marketingService.createTemplate(orgId, userId, dto);
  }

  @Patch('templates/:id')
  updateTemplate(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.marketingService.updateTemplate(orgId, id, dto);
  }

  @Delete('templates/:id')
  removeTemplate(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.removeTemplate(orgId, id);
  }

  // Campaigns
  @Get('campaigns')
  findAll(@OrgId() orgId: string) {
    return this.marketingService.findAll(orgId);
  }

  @Get('campaigns/:id')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.findOne(orgId, id);
  }

  @Get('campaigns/:id/summary')
  getSummary(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.getSummary(orgId, id);
  }

  @Post('campaigns')
  create(@OrgId() orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateCampaignDto) {
    return this.marketingService.create(orgId, userId, dto);
  }

  @Patch('campaigns/:id')
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: Partial<CreateCampaignDto>) {
    return this.marketingService.update(orgId, id, dto);
  }

  @Post('campaigns/:id/launch')
  launch(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.launch(orgId, id);
  }

  @Post('campaigns/:id/pause')
  pause(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.pause(orgId, id);
  }

  @Delete('campaigns/:id')
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.marketingService.remove(orgId, id);
  }

  // Audience preview
  @Post('audience/preview')
  previewAudience(@OrgId() orgId: string, @Body('filter') filter: Record<string, any>) {
    return this.marketingService.previewAudience(orgId, filter || {});
  }
}
