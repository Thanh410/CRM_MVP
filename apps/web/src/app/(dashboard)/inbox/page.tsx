'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { TypingDots } from '@/components/ui/typing-dots';

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  sentAt: string;
}

interface Conversation {
  id: string;
  channel: 'ZALO' | 'MESSENGER' | 'INTERNAL';
  status: 'OPEN' | 'PENDING' | 'CLOSED';
  lastMessageAt: string;
  contact?: { id: string; fullName: string; avatar?: string };
  lead?: { id: string; fullName: string };
  assignedTo?: { id: string; fullName: string; avatar?: string };
  channelAccount?: { id: string; name: string; channel: string };
  messages?: Message[];
  _count?: { messages: number };
}

/** Channel branding — màu thương hiệu thật của từng kênh */
const CHANNEL_META: Record<string, { bg: string; icon: string; label: string }> = {
  ZALO:      { bg: 'bg-sky-500',     icon: '💙', label: 'Zalo' },
  MESSENGER: { bg: 'bg-violet-500',  icon: '💬', label: 'Messenger' },
  INTERNAL:  { bg: 'bg-aurora-mint', icon: '🔔', label: 'Nội bộ' },
};

const STATUS_TONES: Record<string, StatusTone> = {
  OPEN: 'emerald',
  PENDING: 'amber',
  CLOSED: 'muted',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Mở',
  PENDING: 'Chờ',
  CLOSED: 'Đóng',
};

function useConversations(status?: string) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations', status],
    queryFn: () => {
      const params = status ? `?status=${status}` : '';
      return api.get(`/conversations${params}`).then((r) => r.data);
    },
    refetchInterval: 15000,
  });
}

function useConversation(id: string | null) {
  return useQuery<Conversation>({
    queryKey: ['conversations', id],
    queryFn: () => api.get(`/conversations/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 8000,
  });
}

function ConvoAvatar({ id, name, channel }: { id: string; name: string; channel: string }) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.INTERNAL;
  return (
    <div className="relative shrink-0">
      <AvatarGradient id={id} name={name} size="md" />
      <span
        className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full ring-2 ring-card grid place-items-center text-[8px] ${meta.bg}`}
        title={meta.label}
      >
        {meta.icon}
      </span>
    </div>
  );
}

function ConvoListItem({
  convo,
  isActive,
  onClick,
}: {
  convo: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = convo.contact?.fullName ?? convo.lead?.fullName ?? 'Khách hàng';
  const lastMsg = convo.messages?.[0];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 border-b border-border transition-colors ${
        isActive
          ? 'bg-aurora-soft/40 border-l-2 border-l-aurora-violet'
          : 'hover:bg-aurora-soft/30'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ConvoAvatar id={convo.contact?.id ?? convo.lead?.id ?? convo.id} name={name} channel={convo.channel} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground truncate">{name}</p>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
              {new Date(convo.lastMessageAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {lastMsg ? lastMsg.content : 'Chưa có tin nhắn'}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusPill tone={STATUS_TONES[convo.status] ?? 'muted'}>
              {STATUS_LABELS[convo.status]}
            </StatusPill>
          </div>
        </div>
      </div>
    </button>
  );
}

function ChatWindow({ conversationId }: { conversationId: string }) {
  const qc = useQueryClient();
  const { data: convo } = useConversation(conversationId);
  const [message, setMessage] = useState('');
  const [contactSearch, setContactSearch] = useState('');

  const { data: users } = useQuery({
    queryKey: ['users', 'select'],
    queryFn: () => api.get('/users?limit=50').then(r => r.data?.data ?? r.data ?? []),
  });

  const { data: contactsResult } = useQuery({
    queryKey: ['contacts', 'search', contactSearch],
    queryFn: () => api.get('/contacts', { params: { search: contactSearch, limit: 10 } }).then(r => r.data),
    enabled: contactSearch.length >= 2,
  });
  const contacts = contactsResult?.data ?? [];

  const send = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${conversationId}/messages`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', conversationId] });
      setMessage('');
    },
    onError: () => toast.error('Gửi tin nhắn thất bại'),
  });

  const closeConvo = useMutation({
    mutationFn: () => api.patch(`/conversations/${conversationId}/status`, { status: 'CLOSED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Đã đóng hội thoại');
    },
    onError: () => toast.error('Đóng hội thoại thất bại'),
  });

  const assignAgent = useMutation({
    mutationFn: (userId: string) => api.patch(`/conversations/${conversationId}/assign`, { userId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', conversationId] });
      toast.success('Đã gán agent');
    },
    onError: () => toast.error('Gán agent thất bại'),
  });

  const linkContact = useMutation({
    mutationFn: (contactId: string) => api.patch(`/conversations/${conversationId}/link`, { contactId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', conversationId] });
      setContactSearch('');
      toast.success('Đã liên kết liên hệ');
    },
    onError: () => toast.error('Liên kết thất bại'),
  });

  if (!convo) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="animate-spin w-6 h-6 border-4 border-aurora-violet border-t-transparent rounded-full" />
      </div>
    );
  }

  const name = convo.contact?.fullName ?? convo.lead?.fullName ?? 'Khách hàng';
  const channelMeta = CHANNEL_META[convo.channel] ?? CHANNEL_META.INTERNAL;
  // Detect if last message is INBOUND (other side is "typing" — simulate as fresh message indicator)
  const lastMessage = convo.messages?.[convo.messages.length - 1];
  const showTypingHint = lastMessage?.direction === 'INBOUND' &&
    Date.now() - new Date(lastMessage.sentAt).getTime() < 30_000;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-3 flex items-center justify-between bg-card gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ConvoAvatar id={convo.contact?.id ?? convo.lead?.id ?? convo.id} name={name} channel={convo.channel} />
          <div>
            <p className="font-semibold text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">{channelMeta.icon} {channelMeta.label}</span>
              {convo.channelAccount?.name && <> · {convo.channelAccount.name}</>}
              {convo.status === 'OPEN' && (
                <span className="ml-2 text-emerald-600 font-medium">● đang mở</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assign agent dropdown */}
          <div className="flex items-center gap-1.5">
            {convo.assignedTo && (
              <AvatarGradient id={convo.assignedTo.id ?? convo.assignedTo.fullName} name={convo.assignedTo.fullName} size="xs" />
            )}
            <select
              value={convo.assignedTo?.id ?? ''}
              onChange={e => { if (e.target.value) assignAgent.mutate(e.target.value); }}
              className="text-xs border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15 bg-card text-foreground/80 transition"
            >
              <option value="">👥 Gán agent...</option>
              {(users ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          {/* Link contact */}
          <div className="relative flex items-center gap-1.5">
            {convo.contact ? (
              <span className="inline-flex items-center gap-1 text-xs bg-aurora-violet/10 text-aurora-violet px-2 py-1 rounded-lg font-semibold">
                👤 {convo.contact.fullName}
              </span>
            ) : (
              <div className="relative">
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="🔍 Tìm liên hệ..."
                  className="text-xs border border-border rounded-lg px-2 py-1.5 w-32 bg-card focus:outline-none focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15 transition"
                />
                {contactSearch.length >= 2 && contacts.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 z-10 bg-popover text-popover-foreground border border-border rounded-lg shadow-lift w-48 max-h-40 overflow-y-auto">
                    {contacts.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => linkContact.mutate(c.id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-aurora-soft/30 hover:text-aurora-violet transition-colors"
                      >
                        {c.fullName}
                        {c.email && <span className="text-muted-foreground ml-1">({c.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {convo.status !== 'CLOSED' && (
            <RippleButton variant="outline" size="sm" onClick={() => closeConvo.mutate()}>
              Đóng hội thoại
            </RippleButton>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
        {convo.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.direction === 'OUTBOUND'
                  ? 'btn-aurora text-white shadow-pop rounded-tr-sm'
                  : 'bg-card text-foreground border border-border rounded-tl-sm shadow-soft'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.direction === 'OUTBOUND' ? 'text-white/70' : 'text-muted-foreground'}`}>
                {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                {msg.direction === 'OUTBOUND' && ' · ✓✓'}
              </p>
            </div>
          </div>
        ))}
        {showTypingHint && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-soft">
              <TypingDots />
            </div>
          </div>
        )}
        {(!convo.messages || convo.messages.length === 0) && (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">💬</p>
            <p className="text-muted-foreground text-sm">Chưa có tin nhắn nào</p>
          </div>
        )}
      </div>

      {/* Input */}
      {convo.status !== 'CLOSED' ? (
        <div className="border-t border-border p-4 bg-card">
          <div className="flex items-end gap-2 bg-muted rounded-2xl p-2">
            <button className="w-9 h-9 rounded-lg hover:bg-card grid place-items-center text-muted-foreground" title="Đính kèm">📎</button>
            <button className="w-9 h-9 rounded-lg hover:bg-card grid place-items-center text-muted-foreground" title="Emoji">😊</button>
            <textarea
              rows={1}
              className="flex-1 bg-transparent outline-none text-sm py-2 resize-none placeholder:text-muted-foreground"
              placeholder={`Trả lời ${name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                  e.preventDefault();
                  send.mutate(message.trim());
                }
              }}
            />
            <RippleButton
              variant="aurora"
              size="md"
              onClick={() => message.trim() && send.mutate(message.trim())}
              disabled={send.isPending || !message.trim()}
            >
              Gửi
            </RippleButton>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              ⚡ Snippet
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-aurora-violet/10 text-aurora-violet font-semibold">
              🤖 Gợi ý AI
            </span>
          </div>
        </div>
      ) : (
        <div className="border-t border-border p-4 bg-muted/40 text-center text-sm text-muted-foreground">
          Hội thoại đã đóng
        </div>
      )}
    </div>
  );
}

export default function InboxPage() {
  const [statusFilter, setStatusFilter] = useState('OPEN');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { data: conversations, isLoading } = useConversations(statusFilter);

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Hộp thư đa kênh</h1>
          <p className="text-muted-foreground text-sm mt-1">Quản lý hội thoại Zalo · Messenger · Nội bộ</p>
        </div>
      </div>

      <div className="flex-1 flex border border-border rounded-2xl shadow-soft overflow-hidden bg-card">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col">
          {/* Filter tabs */}
          <div className="p-3 border-b border-border">
            <div className="flex bg-muted rounded-lg p-0.5">
              {['OPEN', 'PENDING', 'CLOSED'].map((s) => {
                const count = conversations?.filter(c => c.status === s).length ?? 0;
                return (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setActiveId(null); }}
                    className={`flex-1 h-7 text-xs font-semibold rounded-md transition ${
                      statusFilter === s
                        ? 'btn-aurora text-white shadow-pop'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {STATUS_LABELS[s]}{statusFilter === s && conversations ? ` · ${conversations.length}` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-4 border-aurora-violet border-t-transparent rounded-full" />
              </div>
            ) : conversations?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-3xl mb-2 opacity-40">💬</p>
                <p className="text-muted-foreground text-sm">Không có hội thoại nào</p>
              </div>
            ) : (
              conversations?.map((convo) => (
                <ConvoListItem
                  key={convo.id}
                  convo={convo}
                  isActive={activeId === convo.id}
                  onClick={() => setActiveId(convo.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        {activeId ? (
          <ChatWindow conversationId={activeId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
            <div className="w-16 h-16 rounded-2xl bg-aurora-soft grid place-items-center text-3xl mb-3">💬</div>
            <p className="font-display font-bold text-foreground">Chọn một hội thoại để bắt đầu</p>
            <p className="text-sm mt-1">Tin nhắn Zalo và Messenger sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
}
