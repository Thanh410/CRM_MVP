import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConversationList } from './conversation-list';
import type { ChatConversation } from '../types';

const conversation: ChatConversation = {
  id: 'conversation-1',
  kind: 'DIRECT',
  subject: null,
  lastMessageAt: '2026-05-21T03:00:00.000Z',
  unreadCount: 3,
  participants: [
    {
      userId: 'user-1',
      role: 'MEMBER',
      user: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
    },
    {
      userId: 'user-2',
      role: 'MEMBER',
      user: { id: 'user-2', fullName: 'Lan Hương', email: 'lan@example.com' },
    },
  ],
  messages: [
    {
      id: 'message-1',
      conversationId: 'conversation-1',
      senderId: 'user-2',
      content: 'Chào anh',
      sentAt: '2026-05-21T03:00:00.000Z',
    },
  ],
};

function renderList(overrides: Partial<Parameters<typeof ConversationList>[0]> = {}) {
  return render(
    <ConversationList
      activeId={null}
      conversations={[conversation]}
      currentUserId="user-1"
      kind="all"
      search=""
      userSearch=""
      users={[]}
      onKindChange={vi.fn()}
      onSearchChange={vi.fn()}
      onUserSearchChange={vi.fn()}
      onSelectConversation={vi.fn()}
      onStartDirect={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ConversationList', () => {
  it('renders conversation titles and unread badges', () => {
    renderList();

    expect(screen.getByText('Lan Hương')).toBeInTheDocument();
    expect(screen.getByText('Chào anh')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('switches to the unread filter tab', () => {
    const onKindChange = vi.fn();
    renderList({ onKindChange });

    fireEvent.click(screen.getByRole('button', { name: 'Chưa đọc' }));

    expect(onKindChange).toHaveBeenCalledWith('unread');
  });

  it('starts a direct chat from the user search result', () => {
    const onStartDirect = vi.fn();
    renderList({
      conversations: [],
      userSearch: 'Lan',
      users: [{ id: 'user-2', fullName: 'Lan Hương', email: 'lan@example.com' }],
      onStartDirect,
    });

    fireEvent.click(screen.getByText('Lan Hương'));
    expect(onStartDirect).toHaveBeenCalledWith('user-2');
  });
});
