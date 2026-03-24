'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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

const CHANNEL_ICON: Record<string, string> = {
  ZALO: '🟦',
  MESSENGER: '💬',
  INTERNAL: '🔔',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-gray-100 text-gray-500',
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
    refetchInterval: 15000, // poll every 15s for new messages
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
      className={`w-full text-left p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isActive ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
          {name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <span className="text-xs">{CHANNEL_ICON[convo.channel]}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_BADGE[convo.status]}`}>
                {STATUS_LABELS[convo.status]}
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            {lastMsg ? lastMsg.content : 'Chưa có tin nhắn'}
          </p>
          <p className="text-xs text-gray-300 mt-0.5">
            {new Date(convo.lastMessageAt).toLocaleString('vi-VN')}
          </p>
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
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const name = convo.contact?.fullName ?? convo.lead?.fullName ?? 'Khách hàng';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-3 flex items-center justify-between bg-white gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600 flex-shrink-0">
            {name[0]}
          </div>
          <div>
            <p className="font-medium text-gray-900">{name}</p>
            <p className="text-xs text-gray-500">
              {CHANNEL_ICON[convo.channel]} {convo.channelAccount?.name ?? convo.channel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assign agent dropdown */}
          <div className="flex items-center gap-1.5">
            {convo.assignedTo && (
              <div className="w-6 h-6 rounded-full bg-indigo-200 flex items-center justify-center text-xs font-medium text-indigo-700" title={convo.assignedTo.fullName}>
                {convo.assignedTo?.fullName?.[0] ?? '?'}
              </div>
            )}
            <select
              value={convo.assignedTo?.id ?? ''}
              onChange={e => { if (e.target.value) assignAgent.mutate(e.target.value); }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 bg-white text-gray-600"
            >
              <option value="">Gán agent...</option>
              {(users ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          {/* Link contact */}
          <div className="relative flex items-center gap-1.5">
            {convo.contact ? (
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg border border-indigo-100">
                👤 {convo.contact.fullName}
              </span>
            ) : (
              <div className="relative">
                <input
                  value={contactSearch}
                  onChange={e => setContactSearch(e.target.value)}
                  placeholder="Tìm liên hệ..."
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 w-32 focus:ring-1 focus:ring-indigo-500"
                />
                {contactSearch.length >= 2 && contacts.length > 0 && (
                  <div className="absolute top-full mt-1 left-0 z-10 bg-white border border-gray-200 rounded-lg shadow-lg w-48 max-h-40 overflow-y-auto">
                    {contacts.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => linkContact.mutate(c.id)}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        {c.fullName}
                        {c.email && <span className="text-gray-400 ml-1">({c.email})</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {convo.status !== 'CLOSED' && (
            <button
              onClick={() => closeConvo.mutate()}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              Đóng hội thoại
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {convo.messages?.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.direction === 'OUTBOUND'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
              }`}
            >
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-indigo-200' : 'text-gray-400'}`}>
                {new Date(msg.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {(!convo.messages || convo.messages.length === 0) && (
          <p className="text-center text-gray-400 text-sm py-8">Chưa có tin nhắn nào</p>
        )}
      </div>

      {/* Input */}
      {convo.status !== 'CLOSED' ? (
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <input
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Nhập tin nhắn..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && message.trim()) {
                  e.preventDefault();
                  send.mutate(message.trim());
                }
              }}
            />
            <button
              onClick={() => message.trim() && send.mutate(message.trim())}
              disabled={send.isPending || !message.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 p-4 bg-gray-50 text-center text-sm text-gray-400">
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
          <h1 className="text-2xl font-bold text-gray-900">Hộp thư</h1>
          <p className="text-gray-500 text-sm">Quản lý hội thoại Zalo & Messenger</p>
        </div>
      </div>

      <div className="flex-1 flex border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col">
          {/* Filter tabs */}
          <div className="flex border-b border-gray-200">
            {['OPEN', 'PENDING', 'CLOSED'].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setActiveId(null); }}
                className={`flex-1 py-3 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full" />
              </div>
            ) : conversations?.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">Không có hội thoại nào</p>
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
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p className="text-5xl mb-3">💬</p>
            <p className="font-medium">Chọn một hội thoại để bắt đầu</p>
            <p className="text-sm">Tin nhắn Zalo và Messenger sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>
    </div>
  );
}
