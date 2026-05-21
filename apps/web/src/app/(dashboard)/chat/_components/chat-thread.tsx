'use client';

import { MessageSquare, MoreHorizontal, X } from 'lucide-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { formatChatTime, getConversationSubtitle, getConversationTitle } from '../chat-meta';
import type { ChatConversation, ChatMessage } from '../types';
import { ChatComposer } from './chat-composer';

export function ChatThread({
  conversation,
  currentUserId,
  messageDraft,
  messages,
  messagesLoading,
  sending,
  onBack,
  onDraftChange,
  onOpenGroupSettings,
  onSend,
}: {
  conversation: ChatConversation | null;
  currentUserId?: string;
  messageDraft: string;
  messages?: ChatMessage[];
  messagesLoading?: boolean;
  sending?: boolean;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onOpenGroupSettings: () => void;
  onSend: () => void;
}) {
  if (!conversation) {
    return (
      <main className="hidden min-w-0 flex-1 flex-col items-center justify-center bg-muted/30 text-center text-muted-foreground lg:flex">
        <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-aurora-soft text-aurora-violet">
          <MessageSquare className="h-8 w-8" />
        </div>
        <p className="font-display font-bold text-foreground">Chọn hội thoại để bắt đầu</p>
        <p className="mt-1 text-sm">Chat cá nhân và nhóm nội bộ sẽ hiển thị tại đây.</p>
      </main>
    );
  }

  const title = getConversationTitle(conversation, currentUserId);

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Quay lại danh sách"
        >
          <X className="h-4 w-4" />
        </button>
        <AvatarGradient id={conversation.id} name={title} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{getConversationSubtitle(conversation, currentUserId)}</p>
        </div>
        {conversation.kind === 'GROUP' && (
          <RippleButton variant="ghost" size="sm" onClick={onOpenGroupSettings} aria-label="Quản lý nhóm">
            <MoreHorizontal className="h-4 w-4" />
          </RippleButton>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {messagesLoading ? (
          <div className="grid h-full place-items-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-aurora-violet border-t-transparent" />
          </div>
        ) : messages?.length === 0 ? (
          <div className="grid h-full place-items-center text-center">
            <div>
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-aurora-soft text-aurora-violet">
                <MessageSquare className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-foreground">Chưa có tin nhắn</p>
              <p className="mt-1 text-xs text-muted-foreground">Gửi lời chào đầu tiên trong hội thoại này.</p>
            </div>
          </div>
        ) : (
          messages?.map((item) => {
            const mine = item.senderId === currentUserId;
            return (
              <div key={item.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 text-sm lg:max-w-md ${
                    mine
                      ? 'btn-aurora rounded-tr-sm text-white shadow-pop'
                      : 'rounded-tl-sm border border-border bg-card text-foreground shadow-soft'
                  }`}
                >
                  {!mine && (
                    <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                      {item.sender?.fullName ?? 'Nhân sự'}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{item.content}</p>
                  <p className={`mt-1 text-[10px] ${mine ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {formatChatTime(item.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <ChatComposer value={messageDraft} sending={sending} onChange={onDraftChange} onSend={onSend} />
    </main>
  );
}
