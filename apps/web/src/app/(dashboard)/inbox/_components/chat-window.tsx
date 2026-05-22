'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { TypingDots } from '@/components/ui/typing-dots';
import { getConversationName } from '../conversation-meta';
import { useContactSearch, useConversation, useInboxMutations, useUsersSelect } from '../hooks';
import { Composer } from './composer';
import { ConversationHeader } from './conversation-header';
import { MessageBubble } from './message-bubble';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { data: convo } = useConversation(conversationId);
  const { data: users } = useUsersSelect();
  const [message, setMessage] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const { data: contactsResult } = useContactSearch(contactSearch);
  const { send, closeConvo, assignAgent, linkContact } = useInboxMutations(conversationId);
  const endRef = useRef<HTMLDivElement | null>(null);

  const contacts = contactsResult?.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [conversationId, convo?.messages?.length]);

  if (!convo) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-aurora-violet border-t-transparent" />
      </div>
    );
  }

  const name = getConversationName(convo);
  const lastMessage = convo.messages?.[convo.messages.length - 1];
  const showTypingHint =
    lastMessage?.direction === 'INBOUND' && Date.now() - new Date(lastMessage.sentAt).getTime() < 30_000;

  const handleSend = () => {
    const content = message.trim();
    if (!content) return;
    send.mutate(content, {
      onSuccess: () => setMessage(''),
    });
  };

  const handleLinkContact = (contactId: string) => {
    linkContact.mutate(contactId, {
      onSuccess: () => setContactSearch(''),
    });
  };

  return (
    <div className="flex h-full flex-1 flex-col">
      <ConversationHeader
        convo={convo}
        users={users ?? []}
        contactSearch={contactSearch}
        contacts={contacts}
        onContactSearch={setContactSearch}
        onAssign={(userId) => assignAgent.mutate(userId)}
        onLinkContact={handleLinkContact}
        onClose={() => closeConvo.mutate()}
        closing={closeConvo.isPending}
      />

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {convo.messages?.map((msg) => <MessageBubble key={msg.id} message={msg} />)}
        {showTypingHint && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-soft">
              <TypingDots />
            </div>
          </div>
        )}
        {(!convo.messages || convo.messages.length === 0) && (
          <div className="grid place-items-center py-10 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-aurora-soft text-aurora-violet">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">Chưa có tin nhắn nào</p>
            <p className="mt-1 text-xs text-muted-foreground">Bắt đầu bằng một phản hồi ngắn cho khách hàng.</p>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {convo.status !== 'CLOSED' ? (
        <Composer name={name} value={message} sending={send.isPending} onChange={setMessage} onSend={handleSend} />
      ) : (
        <div className="border-t border-border bg-muted/40 p-4 text-center text-sm text-muted-foreground">
          Hội thoại đã đóng
        </div>
      )}
    </div>
  );
}
