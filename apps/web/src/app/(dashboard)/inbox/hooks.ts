'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Conversation, ConversationFilters } from './types';

function buildConversationParams(filters: ConversationFilters) {
  const params: Record<string, string> = { status: filters.status };
  if (filters.channel !== 'all') params.channel = filters.channel;
  if (filters.assigned !== 'all') params.assigned = filters.assigned;
  const search = filters.search.trim();
  if (search) params.search = search;
  return params;
}

export function useConversations(filters: ConversationFilters) {
  return useQuery<Conversation[]>({
    queryKey: ['conversations', filters],
    queryFn: () => api.get('/conversations', { params: buildConversationParams(filters) }).then((r) => r.data),
    refetchInterval: 15000,
  });
}

export function useConversation(id: string | null) {
  return useQuery<Conversation>({
    queryKey: ['conversations', id],
    queryFn: () => api.get(`/conversations/${id}`).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 8000,
  });
}

export function useInboxMutations(conversationId: string) {
  const qc = useQueryClient();
  const refreshConversation = () => {
    qc.invalidateQueries({ queryKey: ['conversations'] });
    qc.invalidateQueries({ queryKey: ['conversations', conversationId] });
  };

  const send = useMutation({
    mutationFn: (content: string) =>
      api.post(`/conversations/${conversationId}/messages`, { content }).then((r) => r.data),
    onSuccess: refreshConversation,
    onError: () => toast.error('Gửi tin nhắn thất bại'),
  });

  const closeConvo = useMutation({
    mutationFn: () => api.patch(`/conversations/${conversationId}/status`, { status: 'CLOSED' }),
    onSuccess: () => {
      refreshConversation();
      toast.success('Đã đóng hội thoại');
    },
    onError: () => toast.error('Đóng hội thoại thất bại'),
  });

  const assignAgent = useMutation({
    mutationFn: (assigneeId: string) =>
      api.patch(`/conversations/${conversationId}/assign`, { assigneeId }).then((r) => r.data),
    onSuccess: () => {
      refreshConversation();
      toast.success('Đã gán agent');
    },
    onError: () => toast.error('Gán agent thất bại'),
  });

  const linkContact = useMutation({
    mutationFn: (contactId: string) =>
      api.patch(`/conversations/${conversationId}/link`, { contactId }).then((r) => r.data),
    onSuccess: () => {
      refreshConversation();
      toast.success('Đã liên kết liên hệ');
    },
    onError: () => toast.error('Liên kết thất bại'),
  });

  return { send, closeConvo, assignAgent, linkContact };
}

export function useUsersSelect() {
  return useQuery({
    queryKey: ['users', 'select'],
    queryFn: () => api.get('/users?limit=50').then((r) => r.data?.data ?? r.data ?? []),
  });
}

export function useContactSearch(search: string) {
  return useQuery({
    queryKey: ['contacts', 'search', search],
    queryFn: () => api.get('/contacts', { params: { search, limit: 10 } }).then((r) => r.data),
    enabled: search.trim().length >= 2,
  });
}
