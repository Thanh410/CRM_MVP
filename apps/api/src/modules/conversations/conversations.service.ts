import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConversationStatus, MessageDirection } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string, userId: string, status?: ConversationStatus) {
    const where: any = { orgId, deletedAt: null };
    if (status) where.status = status;

    return this.prisma.conversation.findMany({
      where,
      include: {
        contact: { select: { id: true, fullName: true } },
        assignee: { select: { id: true, fullName: true, avatar: true } },
        channelAccount: { select: { id: true, name: true, channel: true } },
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { content: true, direction: true, sentAt: true },
        },
        _count: { select: { messages: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  async findOne(orgId: string, id: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id, orgId, deletedAt: null },
      include: {
        contact: { select: { id: true, fullName: true, phone: true } },
        assignee: { select: { id: true, fullName: true, avatar: true } },
        channelAccount: true,
        participants: { include: { user: { select: { id: true, fullName: true, avatar: true } } } },
        messages: {
          orderBy: { sentAt: 'asc' },
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
    return convo;
  }

  async assign(orgId: string, id: string, assigneeId: string) {
    const convo = await this.prisma.conversation.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return this.prisma.conversation.update({ where: { id }, data: { assignedTo: assigneeId } });
  }

  async updateStatus(orgId: string, id: string, status: ConversationStatus) {
    const convo = await this.prisma.conversation.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return this.prisma.conversation.update({ where: { id }, data: { status } });
  }

  async linkContact(orgId: string, id: string, contactId?: string, leadId?: string) {
    const convo = await this.prisma.conversation.findFirst({ where: { id, orgId, deletedAt: null } });
    if (!convo) throw new NotFoundException('Conversation not found');
    return this.prisma.conversation.update({ where: { id }, data: { contactId, leadId } });
  }

  async sendMessage(orgId: string, conversationId: string, agentId: string, content: string) {
    const convo = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId, deletedAt: null },
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

    await this.prisma.conversation.update({
      where: { id: conversationId },
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
      where: { externalId: data.externalConvoId, channelAccountId: data.channelAccountId },
    });

    if (!convo) {
      const channelAccount = await this.prisma.channelAccount.findUnique({ where: { id: data.channelAccountId } });
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
    const existingMsg = await this.prisma.message.findFirst({ where: { externalId: data.externalMsgId } });
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

    await this.prisma.conversation.update({
      where: { id: convo.id },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }
}
