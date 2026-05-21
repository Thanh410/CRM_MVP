'use client';

import { Search, Users, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { getConversationTitle } from '../chat-meta';
import type { ChatConversation, ChatUser } from '../types';

export function CreateGroupDialog({
  groupName,
  open,
  selectedUserIds,
  users,
  userSearch,
  creating,
  onClose,
  onCreate,
  onGroupNameChange,
  onToggleUser,
  onUserSearchChange,
}: {
  groupName: string;
  open: boolean;
  selectedUserIds: string[];
  users: ChatUser[];
  userSearch: string;
  creating?: boolean;
  onClose: () => void;
  onCreate: () => void;
  onGroupNameChange: (value: string) => void;
  onToggleUser: (userId: string) => void;
  onUserSearchChange: (value: string) => void;
}) {
  if (!open) return null;

  return (
    <DialogFrame title="Tạo nhóm chat" subtitle="Nhóm riêng tư, chỉ thành viên được mời mới thấy." onClose={onClose}>
      <div className="space-y-3 p-4">
        <input
          value={groupName}
          onChange={(event) => onGroupNameChange(event.target.value)}
          placeholder="Tên nhóm"
          className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
        />
        <UserSearchInput value={userSearch} onChange={onUserSearchChange} placeholder="Tìm thành viên..." />
        <UserPickList users={users} selectedUserIds={selectedUserIds} onToggleUser={onToggleUser} />
      </div>
      <div className="flex items-center justify-between border-t border-border p-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {selectedUserIds.length} thành viên đã chọn
        </span>
        <RippleButton onClick={onCreate} disabled={!groupName.trim() || selectedUserIds.length === 0 || creating}>
          Tạo nhóm
        </RippleButton>
      </div>
    </DialogFrame>
  );
}

export function GroupSettingsDialog({
  addUserIds,
  conversation,
  currentUserId,
  groupName,
  open,
  users,
  userSearch,
  saving,
  onAddUsersChange,
  onClose,
  onGroupNameChange,
  onLeave,
  onRemoveUser,
  onRename,
  onSubmitAddUsers,
  onUserSearchChange,
}: {
  addUserIds: string[];
  conversation: ChatConversation | null;
  currentUserId?: string;
  groupName: string;
  open: boolean;
  users: ChatUser[];
  userSearch: string;
  saving?: boolean;
  onAddUsersChange: (userIds: string[]) => void;
  onClose: () => void;
  onGroupNameChange: (value: string) => void;
  onLeave: () => void;
  onRemoveUser: (userId: string) => void;
  onRename: () => void;
  onSubmitAddUsers: () => void;
  onUserSearchChange: (value: string) => void;
}) {
  if (!open || !conversation) return null;
  const isAdmin = conversation.myRole === 'ADMIN';
  const activeUserIds = new Set(conversation.participants.map((participant) => participant.userId));
  const selectableUsers = users.filter((user) => !activeUserIds.has(user.id));

  return (
    <DialogFrame
      title="Quản lý nhóm"
      subtitle={getConversationTitle(conversation, currentUserId)}
      onClose={onClose}
    >
      <div className="space-y-4 p-4">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Tên nhóm</p>
          <div className="flex gap-2">
            <input
              value={groupName}
              onChange={(event) => onGroupNameChange(event.target.value)}
              disabled={!isAdmin}
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none transition disabled:bg-muted focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
            />
            {isAdmin && (
              <RippleButton onClick={onRename} disabled={!groupName.trim() || saving}>
                Lưu
              </RippleButton>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Thành viên</p>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
            {conversation.participants.map((participant) => {
              const isSelf = participant.userId === currentUserId;
              const canRemove = isSelf || (isAdmin && participant.role !== 'ADMIN');
              return (
                <div key={participant.userId} className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                  <AvatarGradient id={participant.userId} name={participant.user.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{participant.user.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {participant.role === 'ADMIN' ? 'Quản trị viên' : 'Thành viên'}
                    </p>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => (isSelf ? onLeave() : onRemoveUser(participant.userId))}
                      className="rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      {isSelf ? 'Rời nhóm' : 'Xóa'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {isAdmin && (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Thêm thành viên</p>
            <UserSearchInput value={userSearch} onChange={onUserSearchChange} placeholder="Tìm nhân sự..." />
            <UserPickList
              users={selectableUsers}
              selectedUserIds={addUserIds}
              onToggleUser={(userId) =>
                onAddUsersChange(
                  addUserIds.includes(userId)
                    ? addUserIds.filter((id) => id !== userId)
                    : [...addUserIds, userId],
                )
              }
            />
            <div className="flex justify-end">
              <RippleButton onClick={onSubmitAddUsers} disabled={addUserIds.length === 0 || saving}>
                Thêm thành viên
              </RippleButton>
            </div>
          </section>
        )}
      </div>
    </DialogFrame>
  );
}

function DialogFrame({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-lift">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-display text-lg font-bold text-foreground">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UserSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
      />
    </div>
  );
}

function UserPickList({
  users,
  selectedUserIds,
  onToggleUser,
}: {
  users: ChatUser[];
  selectedUserIds: string[];
  onToggleUser: (userId: string) => void;
}) {
  return (
    <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
      {users.length === 0 ? (
        <p className="p-3 text-xs text-muted-foreground">Không có nhân sự phù hợp</p>
      ) : (
        users.map((user) => {
          const selected = selectedUserIds.includes(user.id);
          return (
            <button
              key={user.id}
              onClick={() => onToggleUser(user.id)}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                selected ? 'bg-aurora-soft/50' : 'hover:bg-muted'
              }`}
            >
              <AvatarGradient id={user.id} name={user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{user.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
              </div>
              <span
                className={`grid h-5 w-5 place-items-center rounded border text-[10px] ${
                  selected ? 'border-aurora-violet bg-aurora-violet text-white' : 'border-border text-transparent'
                }`}
              >
                ✓
              </span>
            </button>
          );
        })
      )}
    </div>
  );
}
