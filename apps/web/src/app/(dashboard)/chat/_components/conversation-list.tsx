'use client';

import { MessageSquare, Search, UserPlus } from 'lucide-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { cn } from '@/lib/utils';
import { formatChatTime, getConversationSubtitle, getConversationTitle, KIND_LABELS } from '../chat-meta';
import type { ChatConversation, ChatKindFilter, ChatUser } from '../types';

const FILTERS: ChatKindFilter[] = ['all', 'direct', 'group', 'unread'];

export function ConversationList({
  activeId,
  conversations,
  currentUserId,
  isError,
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
  isError?: boolean;
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
    <aside
      className={cn(
        activeId ? 'hidden lg:flex' : 'flex',
        'min-h-0 w-full flex-col border-r border-border bg-card lg:w-[22rem] lg:max-w-sm',
      )}
    >
      <div className="space-y-3 border-b border-border p-3">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              onClick={() => onKindChange(item)}
              className={cn(
                'h-9 rounded-lg px-2 text-xs font-semibold leading-none transition',
                kind === item ? 'btn-aurora text-white shadow-pop' : 'text-muted-foreground hover:bg-card hover:text-foreground',
              )}
            >
              {KIND_LABELS[item]}
            </button>
          ))}
        </div>

        <SearchInput value={search} onChange={onSearchChange} placeholder="Tìm hội thoại..." />
        <SearchInput value={userSearch} onChange={onUserSearchChange} placeholder="Tìm nhân sự để chat..." />

        {userSearch.trim() && (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-background shadow-soft">
            {users.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">Không tìm thấy nhân sự phù hợp</p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => onStartDirect(user.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  <AvatarGradient id={user.id} name={user.fullName} size="xs" />
                  <span className="min-w-0 flex-1 truncate">{user.fullName}</span>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <StateBlock label="Đang tải hội thoại..." />
        ) : isError ? (
          <StateBlock label="Không tải được hội thoại" description="Vui lòng thử lại sau ít phút." />
        ) : conversations?.length === 0 ? (
          <StateBlock
            label={kind === 'unread' ? 'Không có hội thoại chưa đọc' : 'Chưa có hội thoại'}
            description="Tìm nhân sự hoặc tạo nhóm mới để bắt đầu."
          />
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
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
      />
    </div>
  );
}

function StateBlock({ label, description }: { label: string; description?: string }) {
  return (
    <div className="grid min-h-52 place-items-center px-6 py-12 text-center">
      <div>
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-aurora-soft text-aurora-violet">
          <MessageSquare className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
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
  const unread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full border-b border-border p-3 text-left transition',
        active ? 'border-l-2 border-l-aurora-violet bg-aurora-soft/50' : 'hover:bg-muted/70',
      )}
    >
      <div className="flex items-start gap-2.5">
        <AvatarGradient id={conversation.id} name={title} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={cn('min-w-0 flex-1 truncate text-sm text-foreground', unread ? 'font-bold' : 'font-semibold')}>
              {title}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatChatTime(conversation.lastMessageAt)}
            </span>
          </div>
          <p className={cn('mt-0.5 truncate text-xs', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {lastMessage?.content ?? getConversationSubtitle(conversation, currentUserId)}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-medium uppercase text-muted-foreground">
              {conversation.kind === 'GROUP' ? 'Nhóm' : 'Tin nhắn riêng'}
            </span>
            {unread && (
              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-aurora-violet px-1.5 text-[10px] font-bold text-white">
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
