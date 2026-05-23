import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ChannelType, ConversationKind, ConversationParticipantRole } from '@prisma/client';
import { ChatService } from './chat.service';

const prisma = {
  conversation: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  },
  conversationParticipant: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    count: jest.fn(),
  },
  message: {
    count: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
};

const gateway = {
  emitToConversation: jest.fn(),
};

function makeService() {
  return new ChatService(prisma as any, gateway as any);
}

function makeConversation(overrides: Record<string, any> = {}) {
  return {
    id: 'conversation-1',
    orgId: 'org-1',
    channel: ChannelType.INTERNAL,
    kind: ConversationKind.DIRECT,
    externalId: 'dm:user-1:user-2',
    subject: null,
    lastMessageAt: new Date('2026-05-21T03:00:00.000Z'),
    participants: [
      {
        userId: 'user-1',
        role: ConversationParticipantRole.MEMBER,
        lastReadAt: new Date('2026-05-21T02:00:00.000Z'),
        user: { id: 'user-1', fullName: 'User One', email: 'one@example.com', avatar: null },
      },
      {
        userId: 'user-2',
        role: ConversationParticipantRole.MEMBER,
        lastReadAt: null,
        user: { id: 'user-2', fullName: 'User Two', email: 'two@example.com', avatar: null },
      },
    ],
    messages: [],
    _count: { messages: 0 },
    ...overrides,
  };
}

describe('ChatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.message.count.mockResolvedValue(0);
  });

  it('rejects direct chat with yourself', async () => {
    const service = makeService();

    await expect(service.createDirect('org-1', 'user-1', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns existing direct chat for the same two users', async () => {
    const service = makeService();
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      conversationId: 'existing-chat',
      userId: 'user-1',
      role: ConversationParticipantRole.MEMBER,
    });
    prisma.conversation.findFirst
      .mockResolvedValueOnce(makeConversation({ id: 'existing-chat' }))
      .mockResolvedValueOnce(makeConversation({ id: 'existing-chat' }));

    const result = await service.createDirect('org-1', 'user-1', 'user-2');

    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.conversationParticipant.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'existing-chat', userId: { in: ['user-1', 'user-2'] } },
      data: { leftAt: null },
    });
    expect(result.id).toBe('existing-chat');
  });

  it('lists only active conversations for the current participant', async () => {
    const service = makeService();
    prisma.conversation.findMany.mockResolvedValue([makeConversation()]);

    await service.listConversations('org-1', 'user-1', { kind: 'direct', search: 'Lan' });

    expect(prisma.conversation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orgId: 'org-1',
          channel: ChannelType.INTERNAL,
          deletedAt: null,
          kind: ConversationKind.DIRECT,
          participants: { some: { userId: 'user-1', leftAt: null } },
        }),
      }),
    );
  });

  it('computes exact unread count per conversation excluding messages from current user', async () => {
    const service = makeService();
    prisma.conversation.findMany.mockResolvedValue([makeConversation()]);
    prisma.message.count.mockResolvedValue(3);

    const [conversation] = await service.listConversations('org-1', 'user-1', {});

    expect(prisma.message.count).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-1',
        senderId: { not: 'user-1' },
        sentAt: { gt: new Date('2026-05-21T02:00:00.000Z') },
      },
    });
    expect(conversation.unreadCount).toBe(3);
  });

  it('filters unread conversations after computing exact unread counts', async () => {
    const service = makeService();
    prisma.conversation.findMany.mockResolvedValue([
      makeConversation({ id: 'conversation-1' }),
      makeConversation({ id: 'conversation-2' }),
    ]);
    prisma.message.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    const conversations = await service.listConversations('org-1', 'user-1', { unreadOnly: true });

    expect(conversations).toHaveLength(1);
    expect(conversations[0].id).toBe('conversation-2');
    expect(conversations[0].unreadCount).toBe(2);
  });

  it('marks a conversation as read for the current participant', async () => {
    const service = makeService();
    prisma.conversation.findFirst.mockResolvedValue({ id: 'conversation-1' });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      conversationId: 'conversation-1',
      userId: 'user-1',
      role: ConversationParticipantRole.MEMBER,
    });
    prisma.conversationParticipant.update.mockResolvedValue({
      conversationId: 'conversation-1',
      userId: 'user-1',
      lastReadAt: new Date('2026-05-21T03:00:00.000Z'),
    });

    await service.markRead('org-1', 'user-1', 'conversation-1');

    expect(prisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { conversationId_userId: { conversationId: 'conversation-1', userId: 'user-1' } },
      data: { lastReadAt: expect.any(Date) },
      select: { conversationId: true, userId: true, lastReadAt: true },
    });
    expect(gateway.emitToConversation).toHaveBeenCalledWith(
      'org-1',
      ['user-1'],
      'chat:read.updated',
      expect.objectContaining({ conversationId: 'conversation-1', userId: 'user-1' }),
    );
  });

  it('returns the summed unread count across active participant conversations', async () => {
    const service = makeService();
    prisma.conversationParticipant.findMany.mockResolvedValue([
      { conversationId: 'conversation-1', lastReadAt: new Date('2026-05-21T02:00:00.000Z') },
      { conversationId: 'conversation-2', lastReadAt: null },
    ]);
    prisma.message.count.mockResolvedValueOnce(2).mockResolvedValueOnce(4);

    await expect(service.unreadCount('org-1', 'user-1')).resolves.toEqual({ count: 6 });
    expect(prisma.conversationParticipant.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        leftAt: null,
        conversation: {
          orgId: 'org-1',
          channel: ChannelType.INTERNAL,
          deletedAt: null,
        },
      },
      select: { conversationId: true, lastReadAt: true },
    });
  });

  it('allows group admin management but blocks regular members from managing others', async () => {
    const service = makeService();
    prisma.conversation.findFirst.mockResolvedValue({ id: 'group-1' });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      conversationId: 'group-1',
      userId: 'user-1',
      role: ConversationParticipantRole.MEMBER,
    });

    await expect(service.removeGroupParticipant('org-1', 'user-1', 'group-1', 'user-2')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('prevents removing the last group admin', async () => {
    const service = makeService();
    prisma.conversation.findFirst.mockResolvedValue({ id: 'group-1' });
    prisma.conversationParticipant.findFirst
      .mockResolvedValueOnce({
        conversationId: 'group-1',
        userId: 'user-1',
        role: ConversationParticipantRole.ADMIN,
      })
      .mockResolvedValueOnce({
        conversationId: 'group-1',
        userId: 'user-1',
        role: ConversationParticipantRole.ADMIN,
      });
    prisma.conversationParticipant.count.mockResolvedValue(1);

    await expect(service.removeGroupParticipant('org-1', 'user-1', 'group-1', 'user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
