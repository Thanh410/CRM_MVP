import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantScopeService } from '../../common/services/tenant-scope.service';
import { ChannelType, ConversationStatus, MessageDirection } from '@prisma/client';

interface ConversationFilters {
  status?: ConversationStatus;
  channel?: ChannelType;
  search?: string;
  assigned?: string;
}

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private tenantScope: TenantScopeService,
  ) {}

  async findAll(orgId: string, userId: string, filters: ConversationFilters = {}) {
    const where: any = { orgId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.channel === ChannelType.INTERNAL) {
      throw new BadRequestException('Use /chat for internal conversations');
    }
    if (filters.channel) where.channel = filters.channel;
    else where.channel = { not: ChannelType.INTERNAL };
    if (filters.assigned === 'me') where.assignedTo = userId;
    else if (filters.assigned === 'unassigned') where.assignedTo = null;
    else if (filters.assigned) where.assignedTo = filters.assigned;

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { externalId: { contains: search, mode: 'insensitive' } },
        { contact: { is: { fullName: { contains: search, mode: 'insensitive' } } } },
        { contact: { is: { phone: { contains: search, mode: 'insensitive' } } } },
        { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.conversation.findMany({
      where,
      include: {
        contact: { select: { id: true, fullName: true } },
        assignee: { select: { id: true, fullName: true, avatar: true } },
        channelAccount: { select: { id: true, name: true, channel: true } },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { id: true, content: true, direction: true, sentAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
      select: {
        id: true,
        orgId: true,
        contactId: true,
        leadId: true,
        assignedTo: true,
        status: true,
        lastMessageAt: true,
        createdAt: true,
        updatedAt: true,
        contact: { select: { id: true, fullName: true, phone: true } },
        assignee: { select: { id: true, fullName: true, avatar: true } },
        // Channel account: KHÔNG select credentialsEnc (sensitive data)
        channelAccount: {
          select: { id: true, name: true, channel: true, isActive: true },
        },
        participants: {
          select: {
            userId: true,
            joinedAt: true,
            user: { select: { id: true, fullName: true, avatar: true } },
          },
        },
        // Limit 50 messages mới nhất, sort DESC để pagination ngược thuận lợi
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 50,
          select: {
            id: true,
            direction: true,
            content: true,
            mediaUrl: true,
            sentAt: true,
            externalId: true,
          },
        },
      },
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    // Đảo lại sort ASC cho frontend hiển thị từ cũ → mới
    return { ...convo, messages: convo.messages.reverse() };
  }

  async assign(orgId: string, id: string, assigneeId?: string) {
    if (!assigneeId) throw new BadRequestException('assigneeId is required');
    const convo = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    await this.tenantScope.ensureUser(orgId, assigneeId);
    await this.prisma.conversation.updateMany({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
      data: { assignedTo: assigneeId },
    });
    return this.findOne(orgId, id);
  }

  async updateStatus(orgId: string, id: string, status: ConversationStatus) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    await this.prisma.conversation.updateMany({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
      data: { status },
    });
    return this.findOne(orgId, id);
  }

  async linkContact(orgId: string, id: string, contactId?: string, leadId?: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
    });
    if (!convo) throw new NotFoundException('Conversation not found');
    await this.tenantScope.ensureContact(orgId, contactId);
    await this.tenantScope.ensureLead(orgId, leadId);
    await this.prisma.conversation.updateMany({
      where: { id, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
      data: { contactId, leadId },
    });
    return this.findOne(orgId, id);
  }

  async sendMessage(orgId: string, conversationId: string, agentId: string, content: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId, deletedAt: null, channel: { not: ChannelType.INTERNAL } },
      include: { channelAccount: true },
    });
    if (!convo) throw new NotFoundException('Conversation not found');

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.OUTBOUND,
        content,
        sentAt: new Date(),
      },
    });

    await this.prisma.conversation.updateMany({
      where: { id: conversationId, orgId, channel: { not: ChannelType.INTERNAL } },
      data: { lastMessageAt: new Date() },
    });

    // TODO: dispatch to channel adapter (Zalo/Messenger) via BullMQ queue
    return message;
  }

  // Called by webhook adapters to store inbound message
  async receiveMessage(data: {
    orgId: string;
    channelAccountId: string;
    externalConvoId: string;
    externalMsgId: string;
    content: string;
    mediaUrl?: string;
    rawPayload?: any;
    senderExternalId?: string;
  }) {
    // Find or create conversation
    let convo = await this.prisma.conversation.findFirst({
      where: {
        orgId: data.orgId,
        externalId: data.externalConvoId,
        channelAccountId: data.channelAccountId,
      },
    });

    if (!convo) {
      const channelAccount = await this.prisma.channelAccount.findFirst({
        where: { id: data.channelAccountId, orgId: data.orgId, isActive: true },
      });
      if (!channelAccount) throw new NotFoundException('Channel account not found');
      convo = await this.prisma.conversation.create({
        data: {
          orgId: data.orgId,
          channelAccountId: data.channelAccountId,
          channel: channelAccount!.channel,
          externalId: data.externalConvoId,
          status: ConversationStatus.OPEN,
          lastMessageAt: new Date(),
        },
      });
    }

    // Idempotency: skip duplicate messages
    const existingMsg = await this.prisma.message.findFirst({
      where: { conversationId: convo.id, externalId: data.externalMsgId },
    });
    if (existingMsg) return existingMsg;

    const message = await this.prisma.message.create({
      data: {
        conversationId: convo.id,
        direction: MessageDirection.INBOUND,
        content: data.content,
        mediaUrl: data.mediaUrl,
        externalId: data.externalMsgId,
        rawPayload: data.rawPayload,
        sentAt: new Date(),
      },
    });

    await this.prisma.conversation.updateMany({
      where: { id: convo.id, orgId: data.orgId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }
}
