import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GroupSettingsDialog } from './group-dialogs';
import type { ChatConversation } from '../types';

function makeConversation(role: 'ADMIN' | 'MEMBER'): ChatConversation {
  return {
    id: 'group-1',
    kind: 'GROUP',
    subject: 'Nhóm kinh doanh',
    unreadCount: 0,
    myRole: role,
    participants: [
      {
        userId: 'user-1',
        role,
        user: { id: 'user-1', fullName: 'Admin User', email: 'admin@example.com' },
      },
      {
        userId: 'user-2',
        role: 'MEMBER',
        user: { id: 'user-2', fullName: 'Lan Hương', email: 'lan@example.com' },
      },
    ],
  };
}

describe('GroupSettingsDialog', () => {
  it('shows management actions for group admins', () => {
    render(
      <GroupSettingsDialog
        addUserIds={[]}
        conversation={makeConversation('ADMIN')}
        currentUserId="user-1"
        groupName="Nhóm kinh doanh"
        open
        users={[{ id: 'user-3', fullName: 'Minh Anh', email: 'minh@example.com' }]}
        userSearch=""
        onAddUsersChange={vi.fn()}
        onClose={vi.fn()}
        onGroupNameChange={vi.fn()}
        onLeave={vi.fn()}
        onRemoveUser={vi.fn()}
        onRename={vi.fn()}
        onSubmitAddUsers={vi.fn()}
        onUserSearchChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Thêm thành viên').length).toBeGreaterThan(0);
    expect(screen.getByText('Xóa')).toBeInTheDocument();
    expect(screen.getByText('Lưu')).toBeInTheDocument();
  });

  it('lets regular members leave but hides admin-only actions', () => {
    const onLeave = vi.fn();
    render(
      <GroupSettingsDialog
        addUserIds={[]}
        conversation={makeConversation('MEMBER')}
        currentUserId="user-1"
        groupName="Nhóm kinh doanh"
        open
        users={[]}
        userSearch=""
        onAddUsersChange={vi.fn()}
        onClose={vi.fn()}
        onGroupNameChange={vi.fn()}
        onLeave={onLeave}
        onRemoveUser={vi.fn()}
        onRename={vi.fn()}
        onSubmitAddUsers={vi.fn()}
        onUserSearchChange={vi.fn()}
      />,
    );

    expect(screen.queryByText('Thêm thành viên')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Rời nhóm'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
