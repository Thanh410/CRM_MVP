'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useConversations } from './hooks';
import type { ConversationFilters } from './types';
import { ChatWindow } from './_components/chat-window';
import { ConversationSidebar } from './_components/conversation-sidebar';

export default function InboxPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ConversationFilters>({
    status: 'OPEN',
    channel: 'all',
    assigned: 'all',
    search: '',
  });
  const { data: conversations, isLoading } = useConversations(filters);

  const handleFiltersChange = (nextFilters: ConversationFilters) => {
    setFilters(nextFilters);
    setActiveId(null);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Hộp thư đa kênh</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quản lý hội thoại Zalo · Messenger · Nội bộ</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ConversationSidebar
          conversations={conversations}
          isLoading={isLoading}
          filters={filters}
          activeId={activeId}
          onFiltersChange={handleFiltersChange}
          onSelect={setActiveId}
        />

        {activeId ? (
          <ChatWindow conversationId={activeId} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-muted/30 text-muted-foreground">
            <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-aurora-soft text-aurora-violet">
              <MessageSquare className="h-8 w-8" />
            </div>
            <p className="font-display font-bold text-foreground">Chọn một hội thoại để bắt đầu</p>
            <p className="mt-1 text-sm">Tin nhắn Zalo và Messenger sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
}
