import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChannelType,
  ConversationKind,
  ConversationParticipantRole,
  ConversationStatus,
  MessageDirection,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

type ChatKindFilter = 'direct' | 'group';
type ChatListQuery = { kind?: ChatKindFilter; search?: string; unreadOnly?: boolean };

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: ChatGateway,
  ) {}

  async listConversations(orgId: string, userId: string, query: ChatListQuery) {
    const where: any = {
      orgId,
      channel: ChannelType.INTERNAL,
      deletedAt: null,
      participants: { some: { userId, leftAt: null } },
    };

    if (query.kind === 'direct') where.kind = ConversationKind.DIRECT;
    if (query.kind === 'group') where.kind = ConversationKind.GROUP;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        {
          participants: {
            some: {
              leftAt: null,
              user: { fullName: { contains: search, mode: 'insensitive' } },
            },
          },
        },
        { messages: { some: { content: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: this.conversationInclude(userId),
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const presented = await Promise.all(
      conversations.map((conversation) => this.presentConversation(conversation, userId)),
    );

    if (query.unreadOnly) {
      return presented.filter((conversation) => conversation.unreadCount > 0);
    }

    return presented;
  }

  async createDirect(orgId: string, userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new BadRequestException('Cannot start a direct chat with yourself');
    await this.ensureUsersInOrg(orgId, [userId, targetUserId]);

    const [first, second] = [userId, targetUserId].sort();
    const externalId = `dm:${first}:${second}`;

    const existing = await this.prisma.conversation.findFirst({
      where: { orgId, channel: ChannelType.INTERNAL, kind: ConversationKind.DIRECT, externalId, deletedAt: null },
      include: this.conversationInclude(userId),
    });

    if (existing) {
      await this.prisma.conversationParticipant.updateMany({
        where: { conversationId: existing.id, userId: { in: [userId, targetUserId] } },
        data: { leftAt: null },
      });
      return this.findConversation(orgId, userId, existing.id);
    }

    const conversation = await this.prisma.conversation.create({
      data: {
        orgId,
        channel: ChannelType.INTERNAL,
        kind: ConversationKind.DIRECT,
        externalId,
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        participants: {
          create: [
            { userId, role: ConversationParticipantRole.MEMBER, lastReadAt: new Date() },
            { userId: targetUserId, role: ConversationParticipantRole.MEMBER },
          ],
        },
      },
      include: this.conversationInclude(userId),
    });

    const payload = await this.presentConversation(conversation, userId);
    this.gateway.emitToConversation(orgId, [userId, targetUserId], 'chat:conversation.updated', payload);
    return payload;
  }

  async createGroup(orgId: string, userId: string, name: string, participantIds: string[]) {
    const uniqueParticipantIds = [...new Set(participantIds.filter((id) => id !== userId))];
    if (uniqueParticipantIds.length === 0) {
      throw new BadRequestException('Group chat requires at least one other participant');
    }
    await this.ensureUsersInOrg(orgId, [userId, ...uniqueParticipantIds]);

    const conversation = await this.prisma.conversation.create({
      data: {
        orgId,
        channel: ChannelType.INTERNAL,
        kind: ConversationKind.GROUP,
        externalId: `group:${uuidv4()}`,
        subject: name.trim(),
        status: ConversationStatus.OPEN,
        lastMessageAt: new Date(),
        participants: {
          create: [
            { userId, role: ConversationParticipantRole.ADMIN, lastReadAt: new Date() },
            ...uniqueParticipantIds.map((participantId) => ({
              userId: participantId,
              role: ConversationParticipantRole.MEMBER,
            })),
          ],
        },
      },
      include: this.conversationInclude(userId),
    });

    const activeUserIds = await this.getActiveParticipantIds(conversation.id);
    const payload = await this.presentConversation(conversation, userId);
    this.gateway.emitToConversation(orgId, activeUserIds, 'chat:conversation.updated', payload);
    return payload;
  }

  async findConversation(orgId: string, userId: string, conversationId: string) {
    await this.ensureActiveParticipant(conversationId, userId);
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, orgId, channel: ChannelType.INTERNAL, deletedAt: null },
      include: this.conversationInclude(userId),
    });
    if (!conversation) throw new NotFoundException('Chat conversation not found');
    return this.presentConversation(conversation, userId);
  }

  async listMessages(orgId: string, userId: string, conversationId: string, query: { cursor?: string; limit?: string }) {
    await this.ensureConversationInOrg(orgId, conversationId);
    await this.ensureActiveParticipant(conversationId, userId);

    const limit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'desc' },
      take: limit,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: this.messageSelect(),
    });

    return messages.reverse();
  }

  async sendMessage(orgId: string, userId: string, conversationId: string, content: string) {
    await this.ensureConversationInOrg(orgId, conversationId);
    await this.ensureActiveParticipant(conversationId, userId);

    const now = new Date();
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        direction: MessageDirection.INTERNAL,
        senderId: userId,
        content: content.trim(),
        sentAt: now,
      },
      select: this.messageSelect(),
    });

    await this.prisma.conversation.updateMany({
      where: { id: conversationId, orgId, channel: ChannelType.INTERNAL },
      data: { lastMessageAt: now },
    });
    await this.prisma.conversationParticipant.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: now, leftAt: null },
    });

    const activeUserIds = await this.getActiveParticipantIds(conversationId);
    this.gateway.emitToConversation(orgId, activeUserIds, 'chat:message.created', { conversationId, message });
    this.gateway.emitToConversation(orgId, activeUserIds, 'chat:conversation.updated', { conversationId });
    return message;
  }

  async markRead(orgId: string, userId: string, conversationId: string) {
    await this.ensureConversationInOrg(orgId, conversationId);
    await this.ensureActiveParticipant(conversationId, userId);
    const participant = await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
      select: { conversationId: true, userId: true, lastReadAt: true },
    });
    this.gateway.emitToConversation(orgId, [userId], 'chat:read.updated', participant);
    return participant;
  }

  async unreadCount(orgId: string, userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: {
        userId,
        leftAt: null,
        conversation: {
          orgId,
          channel: ChannelType.INTERNAL,
          deletedAt: null,
        },
      },
      select: { conversationId: true, lastReadAt: true },
    });

    const counts = await Promise.all(
      participants.map((participant) =>
        this.countUnreadMessages(participant.conversationId, userId, participant.lastReadAt),
      ),
    );

    return { count: counts.reduce((total, count) => total + count, 0) };
  }

  async updateGroupName(orgId: string, userId: string, conversationId: string, name: string) {
    await this.ensureGroupAdmin(orgId, userId, conversationId);
    await this.prisma.conversation.updateMany({
      where: { id: conversationId, orgId, channel: ChannelType.INTERNAL, kind: ConversationKind.GROUP },
      data: { subject: name.trim() },
    });
    const activeUserIds = await this.getActiveParticipantIds(conversationId);
    const payload = await this.findConversation(orgId, userId, conversationId);
    this.gateway.emitToConversation(orgId, activeUserIds, 'chat:conversation.updated', payload);
    return payload;
  }

  async addGroupParticipants(orgId: string, userId: string, conversationId: string, userIds: string[]) {
    await this.ensureGroupAdmin(orgId, userId, conversationId);
    const uniqueUserIds = [...new Set(userIds)];
    await this.ensureUsersInOrg(orgId, uniqueUserIds);

    for (const participantId of uniqueUserIds) {
      await this.prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId, userId: participantId } },
        create: { conversationId, userId: participantId, role: ConversationParticipantRole.MEMBER },
        update: { leftAt: null, role: ConversationParticipantRole.MEMBER },
      });
    }

    const activeUserIds = await this.getActiveParticipantIds(conversationId);
    const payload = await this.findConversation(orgId, userId, conversationId);
    this.gateway.emitToConversation(orgId, activeUserIds, 'chat:participant.updated', payload);
    return payload;
  }

  async removeGroupParticipant(orgId: string, actorId: string, conversationId: string, participantId: string) {
    const actor = await this.ensureActiveParticipant(conversationId, actorId);
    await this.ensureConversationInOrg(orgId, conversationId, ConversationKind.GROUP);

    const removingSelf = actorId === participantId;
    if (!removingSelf && actor.role !== ConversationParticipantRole.ADMIN) {
      throw new ForbiddenException('Only group admins can remove participants');
    }

    const target = await this.ensureActiveParticipant(conversationId, participantId);
    if (target.role === ConversationParticipantRole.ADMIN) {
      const adminCount = await this.prisma.conversationParticipant.count({
        where: { conversationId, role: ConversationParticipantRole.ADMIN, leftAt: null },
      });
      if (adminCount <= 1) throw new BadRequestException('Group must keep at least one admin');
    }

    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId: participantId } },
      data: { leftAt: new Date() },
    });

    const activeUserIds = await this.getActiveParticipantIds(conversationId);
    const payload = { conversationId, participantId };
    this.gateway.emitToConversation(orgId, [...activeUserIds, participantId], 'chat:participant.updated', payload);
    return payload;
  }

  private async ensureConversationInOrg(orgId: string, conversationId: string, kind?: ConversationKind) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId,
        channel: ChannelType.INTERNAL,
        deletedAt: null,
        ...(kind ? { kind } : {}),
      },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Chat conversation not found');
  }

  private async ensureUsersInOrg(orgId: string, userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds }, orgId, deletedAt: null, status: { not: 'INACTIVE' } },
      select: { id: true },
    });
    if (users.length !== uniqueUserIds.length) throw new BadRequestException('One or more users are invalid');
  }

  private async ensureActiveParticipant(conversationId: string, userId: string) {
    const participant = await this.prisma.conversationParticipant.findFirst({
      where: { conversationId, userId, leftAt: null },
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this chat');
    return participant;
  }

  private async ensureGroupAdmin(orgId: string, userId: string, conversationId: string) {
    await this.ensureConversationInOrg(orgId, conversationId, ConversationKind.GROUP);
    const participant = await this.ensureActiveParticipant(conversationId, userId);
    if (participant.role !== ConversationParticipantRole.ADMIN) {
      throw new ForbiddenException('Only group admins can manage this group');
    }
  }

  private async getActiveParticipantIds(conversationId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, leftAt: null },
      select: { userId: true },
    });
    return participants.map((participant) => participant.userId);
  }

  private conversationInclude(userId: string) {
    return {
      participants: {
        where: { leftAt: null },
        select: {
          userId: true,
          role: true,
          joinedAt: true,
          lastReadAt: true,
          user: { select: { id: true, fullName: true, email: true, avatar: true } },
        },
      },
      messages: {
        orderBy: { sentAt: 'desc' as const },
        take: 1,
        select: this.messageSelect(),
      },
      _count: { select: { messages: true } },
    };
  }

  private messageSelect() {
    return {
      id: true,
      conversationId: true,
      direction: true,
      senderId: true,
      content: true,
      sentAt: true,
      createdAt: true,
      sender: { select: { id: true, fullName: true, avatar: true } },
    };
  }

  private async countUnreadMessages(conversationId: string, userId: string, lastReadAt?: Date | string | null) {
    return this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        ...(lastReadAt ? { sentAt: { gt: lastReadAt } } : {}),
      },
    });
  }

  private async presentConversation(conversation: any, userId: string) {
    const me = conversation.participants?.find((participant: any) => participant.userId === userId);
    const unreadCount = await this.countUnreadMessages(conversation.id, userId, me?.lastReadAt);

    return {
      ...conversation,
      messages: conversation.messages ? [...conversation.messages].reverse() : [],
      myRole: me?.role,
      lastReadAt: me?.lastReadAt ?? null,
      unreadCount,
    };
  }
}
