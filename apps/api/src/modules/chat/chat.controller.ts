import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { CreateDirectChatDto } from './dto/create-direct-chat.dto';
import { CreateGroupChatDto } from './dto/create-group-chat.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { UpdateGroupChatDto } from './dto/update-group-chat.dto';
import { AddGroupParticipantsDto } from './dto/add-group-participants.dto';

@ApiTags('chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiQuery({ name: 'kind', enum: ['direct', 'group'], required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'unreadOnly', required: false })
  listConversations(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Query('kind') kind?: 'direct' | 'group',
    @Query('search') search?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.chatService.listConversations(orgId, userId, {
      kind,
      search,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  unreadCount(@OrgId() orgId: string, @CurrentUser('id') userId: string) {
    return this.chatService.unreadCount(orgId, userId);
  }

  @Post('direct')
  createDirect(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateDirectChatDto,
  ) {
    return this.chatService.createDirect(orgId, userId, dto.userId);
  }

  @Post('groups')
  createGroup(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateGroupChatDto,
  ) {
    return this.chatService.createGroup(orgId, userId, dto.name, dto.participantIds);
  }

  @Get('conversations/:id')
  findConversation(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.findConversation(orgId, userId, id);
  }

  @Get('conversations/:id/messages')
  listMessages(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listMessages(orgId, userId, id, { cursor, limit });
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.chatService.sendMessage(orgId, userId, id, dto.content);
  }

  @Patch('conversations/:id/read')
  markRead(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.chatService.markRead(orgId, userId, id);
  }

  @Patch('groups/:id')
  updateGroupName(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGroupChatDto,
  ) {
    return this.chatService.updateGroupName(orgId, userId, id, dto.name);
  }

  @Post('groups/:id/participants')
  addParticipants(
    @OrgId() orgId: string,
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: AddGroupParticipantsDto,
  ) {
    return this.chatService.addGroupParticipants(orgId, userId, id, dto.userIds);
  }

  @Delete('groups/:id/participants/:userId')
  removeParticipant(
    @OrgId() orgId: string,
    @CurrentUser('id') actorId: string,
    @Param('id') id: string,
    @Param('userId') participantId: string,
  ) {
    return this.chatService.removeGroupParticipant(orgId, actorId, id, participantId);
  }
}
