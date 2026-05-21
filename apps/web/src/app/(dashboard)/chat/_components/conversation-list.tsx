'use client';

import { Search } from 'lucide-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { cn } from '@/lib/utils';
import { formatChatTime, getConversationSubtitle, getConversationTitle, KIND_LABELS } from '../chat-meta';
import type { ChatConversation, ChatKindFilter, ChatUser } from '../types';

export function ConversationList({
  activeId,
  conversations,
  currentUserId,
  isLoading,
  kind,
  search,
  userSearch,
  users,
  onKindChange,
  onSearchChange,
  onUserSearchChange,
  onSelectConversation,
  onStartDirect,
}: {
  activeId: string | null;
  conversations?: ChatConversation[];
  currentUserId?: string;
  isLoading?: boolean;
  kind: ChatKindFilter;
  search: string;
  userSearch: string;
  users: ChatUser[];
  onKindChange: (kind: ChatKindFilter) => void;
  onSearchChange: (search: string) => void;
  onUserSearchChange: (search: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onStartDirect: (userId: string) => void;
}) {
  return (
    <aside className={`${activeId ? 'hidden lg:flex' : 'flex'} w-full flex-col border-r border-border lg:w-80`}>
      <div className="space-y-3 border-b border-border p-3">
        <div className="flex rounded-lg bg-muted p-0.5">
          {(['all', 'direct', 'group'] as const).map((item) => (
            <button
              key={item}
              onClick={() => onKindChange(item)}
              className={cn(
                'h-8 flex-1 rounded-md text-xs font-semibold transition',
                kind === item ? 'btn-aurora text-white shadow-pop' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {KIND_LABELS[item]}
            </button>
          ))}
        </div>

        <SearchInput value={search} onChange={onSearchChange} placeholder="Tìm hội thoại..." />
        <SearchInput value={userSearch} onChange={onUserSearchChange} placeholder="Tìm nhân sự để chat..." />

        {userSearch.trim() && (
          <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-background">
            {users.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Không tìm thấy nhân sự</p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onStartDirect(user.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <AvatarGradient id={user.id} name={user.fullName} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="grid h-32 place-items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-aurora-violet border-t-transparent" />
          </div>
        ) : conversations?.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Chưa có hội thoại</p>
            <p className="mt-1 text-xs text-muted-foreground">Tìm nhân sự hoặc tạo nhóm mới để bắt đầu.</p>
          </div>
        ) : (
          conversations?.map((conversation) => (
            <ConversationListItem
              key={conversation.id}
              active={activeId === conversation.id}
              conversation={conversation}
              currentUserId={currentUserId}
              onClick={() => onSelectConversation(conversation.id)}
            />
          ))
        )}
      </div>
    </aside>
  );
}

function SearchInput({
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
        className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
      />
    </div>
  );
}

function ConversationListItem({
  active,
  conversation,
  currentUserId,
  onClick,
}: {
  active: boolean;
  conversation: ChatConversation;
  currentUserId?: string;
  onClick: () => void;
}) {
  const title = getConversationTitle(conversation, currentUserId);
  const lastMessage = conversation.messages?.[0];

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full border-b border-border p-3 text-left transition',
        active ? 'border-l-2 border-l-aurora-violet bg-aurora-soft/40' : 'hover:bg-muted/70',
      )}
    >
      <div className="flex items-start gap-2.5">
        <AvatarGradient id={conversation.id} name={title} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">{formatChatTime(conversation.lastMessageAt)}</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {lastMessage?.content ?? getConversationSubtitle(conversation, currentUserId)}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">
              {conversation.kind === 'GROUP' ? 'Nhóm' : 'Cá nhân'}
            </span>
            {conversation.unreadCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-aurora-violet px-1.5 text-[10px] font-bold text-white">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
