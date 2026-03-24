import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConversationStatus } from '@prisma/client';

@ApiTags('conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiQuery({ name: 'status', enum: ConversationStatus, required: false })
  findAll(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Query('status') status?: ConversationStatus,
  ) {
    return this.conversationsService.findAll(orgId, userId, status);
  }

  @Get(':id')
  findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.conversationsService.findOne(orgId, id);
  }

  @Patch(':id/assign')
  assign(@OrgId() orgId: string, @Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.conversationsService.assign(orgId, id, assigneeId);
  }

  @Patch(':id/status')
  updateStatus(@OrgId() orgId: string, @Param('id') id: string, @Body('status') status: ConversationStatus) {
    return this.conversationsService.updateStatus(orgId, id, status);
  }

  @Patch(':id/link')
  linkContact(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('contactId') contactId?: string,
    @Body('leadId') leadId?: string,
  ) {
    return this.conversationsService.linkContact(orgId, id, contactId, leadId);
  }

  @Post(':id/messages')
  sendMessage(
    @OrgId() orgId: string,
    @Param('id') conversationId: string,
    @CurrentUser('id') agentId: string,
    @Body('content') content: string,
  ) {
    return this.conversationsService.sendMessage(orgId, conversationId, agentId, content);
  }
}
