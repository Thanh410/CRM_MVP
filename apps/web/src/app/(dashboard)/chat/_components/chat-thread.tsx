'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ChevronLeft, MessageSquare, MoreHorizontal, RotateCcw } from 'lucide-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { cn } from '@/lib/utils';
import { formatChatDate, formatChatTime, getConversationSubtitle, getConversationTitle } from '../chat-meta';
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
  onRetryMessage,
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
  onRetryMessage: (message: ChatMessage) => void;
  onSend: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const lastMessageId = messages?.[messages.length - 1]?.id;

  const groupedMessages = useMemo(() => {
    return (messages ?? []).map((message, index, list) => {
      const previous = list[index - 1];
      const currentDate = new Date(message.sentAt).toDateString();
      const previousDate = previous ? new Date(previous.sentAt).toDateString() : null;
      return {
        message,
        showDate: currentDate !== previousDate,
        compact:
          !!previous &&
          previous.senderId === message.senderId &&
          currentDate === previousDate &&
          !message.failed &&
          !message.pending,
      };
    });
  }, [messages]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !lastMessageId) return;
    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 120) {
      requestAnimationFrame(() => {
        element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
      });
      setShowNewMessages(false);
    } else {
      setShowNewMessages(true);
    }
  }, [lastMessageId]);

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
    <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <button
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
          aria-label="Quay lại danh sách"
        >
          <ChevronLeft className="h-5 w-5" />
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

      <div className="relative min-h-0 flex-1 bg-muted/30">
        <div
          ref={scrollRef}
          onScroll={(event) => {
            const element = event.currentTarget;
            const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
            if (distanceFromBottom < 80) setShowNewMessages(false);
          }}
          className="h-full space-y-2 overflow-y-auto p-3 lg:p-4"
        >
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
            groupedMessages.map(({ message, showDate, compact }) => (
              <div key={message.id}>
                {showDate && (
                  <div className="sticky top-2 z-10 my-3 flex justify-center">
                    <span className="rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] font-semibold text-muted-foreground shadow-soft">
                      {formatChatDate(message.sentAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  compact={compact}
                  currentUserId={currentUserId}
                  message={message}
                  onRetry={() => onRetryMessage(message)}
                />
              </div>
            ))
          )}
        </div>

        {showNewMessages && (
          <button
            type="button"
            onClick={() => {
              const element = scrollRef.current;
              if (!element) return;
              element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
              setShowNewMessages(false);
            }}
            className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-foreground px-3 py-2 text-xs font-semibold text-background shadow-lift"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Tin mới
          </button>
        )}
      </div>

      <ChatComposer value={messageDraft} sending={sending} onChange={onDraftChange} onSend={onSend} />
    </main>
  );
}

function MessageBubble({
  compact,
  currentUserId,
  message,
  onRetry,
}: {
  compact: boolean;
  currentUserId?: string;
  message: ChatMessage;
  onRetry: () => void;
}) {
  const mine = message.senderId === currentUserId;

  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start', compact ? 'mt-1' : 'mt-3')}>
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-4 py-2 text-sm shadow-soft sm:max-w-md lg:max-w-lg',
          mine
            ? 'btn-aurora rounded-tr-sm text-white'
            : 'rounded-tl-sm border border-border bg-card text-foreground',
          message.failed && 'border border-rose-300 bg-rose-50 text-rose-900',
          message.pending && 'opacity-75',
        )}
      >
        {!mine && !compact && (
          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
            {message.sender?.fullName ?? 'Nhân sự'}
          </p>
        )}
        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{message.content}</p>
        <div className={cn('mt-1 flex items-center justify-end gap-2 text-[10px]', mine ? 'text-white/70' : 'text-muted-foreground')}>
          {message.failed ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 font-semibold text-rose-700"
            >
              <RotateCcw className="h-3 w-3" />
              Gửi lại
            </button>
          ) : (
            <span>{message.pending ? 'Đang gửi...' : formatChatTime(message.sentAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
