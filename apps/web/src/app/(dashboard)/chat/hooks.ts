'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type {
  ChatConversation,
  ChatKindFilter,
  ChatMessage,
  ChatUnreadCountResponse,
  ChatUser,
} from './types';

type SendMessagePayload = {
  content: string;
  clientId?: string;
};

function normalizeMessages(messages?: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  for (const message of messages ?? []) {
    byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(
    (first, second) => new Date(first.sentAt).getTime() - new Date(second.sentAt).getTime(),
  );
}

export function useChatConversations(kind: ChatKindFilter, search: string) {
  return useQuery<ChatConversation[]>({
    queryKey: ['chat', 'conversations', kind, search],
    queryFn: () =>
      api
        .get('/chat/conversations', {
          params: {
            ...(kind === 'direct' || kind === 'group' ? { kind } : {}),
            ...(kind === 'unread' ? { unreadOnly: true } : {}),
            ...(search.trim() ? { search: search.trim() } : {}),
          },
        })
        .then((res) => res.data),
    refetchInterval: 15000,
  });
}

export function useChatMessages(conversationId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['chat', 'messages', conversationId],
    queryFn: () => api.get(`/chat/conversations/${conversationId}/messages`).then((res) => res.data),
    enabled: !!conversationId,
    refetchInterval: 10000,
  });
}

export function useChatConversation(conversationId: string | null) {
  return useQuery<ChatConversation>({
    queryKey: ['chat', 'conversation', conversationId],
    queryFn: () => api.get(`/chat/conversations/${conversationId}`).then((res) => res.data),
    enabled: !!conversationId,
  });
}

export function useChatUsers(search: string) {
  return useQuery<ChatUser[]>({
    queryKey: ['chat', 'users', search],
    queryFn: () =>
      api
        .get('/users', { params: { search, limit: 50 } })
        .then((res) => res.data?.data ?? res.data ?? []),
  });
}

export function useChatUnreadCount() {
  return useQuery<ChatUnreadCountResponse>({
    queryKey: ['chat', 'unread-count'],
    queryFn: () => api.get('/chat/unread-count').then((res) => res.data),
    refetchInterval: 30000,
  });
}

export function useChatMutations(activeId: string | null, currentUserId?: string, currentUserName?: string) {
  const queryClient = useQueryClient();

  const refreshConversations = () => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
  };

  const refreshActiveMessages = (conversationId = activeId) => {
    if (conversationId) queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
  };

  const startDirect = useMutation({
    mutationFn: (userId: string) => api.post('/chat/direct', { userId }).then((res) => res.data as ChatConversation),
    onSuccess: () => refreshConversations(),
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Không mở được chat cá nhân'),
  });

  const createGroup = useMutation({
    mutationFn: (payload: { name: string; participantIds: string[] }) =>
      api.post('/chat/groups', payload).then((res) => res.data as ChatConversation),
    onSuccess: () => refreshConversations(),
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Tạo nhóm thất bại'),
  });

  const sendMessage = useMutation({
    mutationFn: (payload: SendMessagePayload | string) => {
      const content = typeof payload === 'string' ? payload : payload.content;
      return api
        .post(`/chat/conversations/${activeId}/messages`, { content })
        .then((res) => res.data as ChatMessage);
    },
    onMutate: async (payload) => {
      if (!activeId || !currentUserId) return undefined;
      const content = typeof payload === 'string' ? payload : payload.content;
      const clientId =
        typeof payload === 'string' || !payload.clientId ? `pending-${Date.now()}` : payload.clientId;

      await queryClient.cancelQueries({ queryKey: ['chat', 'messages', activeId] });
      const previousMessages = queryClient.getQueryData<ChatMessage[]>(['chat', 'messages', activeId]);
      const optimisticMessage: ChatMessage = {
        id: clientId,
        conversationId: activeId,
        senderId: currentUserId,
        content,
        sentAt: new Date().toISOString(),
        sender: { id: currentUserId, fullName: currentUserName ?? 'Bạn', avatar: null },
        pending: true,
      };

      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', activeId], (current) =>
        normalizeMessages([...(current ?? []).filter((message) => message.id !== clientId), optimisticMessage]),
      );

      return { clientId, conversationId: activeId, previousMessages };
    },
    onSuccess: (message, _payload, context) => {
      if (!context?.conversationId) return;
      queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', context.conversationId], (current) =>
        normalizeMessages([...(current ?? []).filter((item) => item.id !== context.clientId && item.id !== message.id), message]),
      );
      refreshConversations();
    },
    onError: (error: any, _payload, context) => {
      if (context?.conversationId && context.clientId) {
        queryClient.setQueryData<ChatMessage[]>(['chat', 'messages', context.conversationId], (current) =>
          normalizeMessages(
            (current ?? []).map((message) =>
              message.id === context.clientId ? { ...message, pending: false, failed: true } : message,
            ),
          ),
        );
      }
      toast.error(error.response?.data?.message ?? 'Gửi tin nhắn thất bại');
    },
  });

  const markRead = useMutation({
    mutationFn: (conversationId: string) => api.patch(`/chat/conversations/${conversationId}/read`),
    onSuccess: (_, conversationId) => {
      refreshConversations();
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', conversationId] });
    },
  });

  const renameGroup = useMutation({
    mutationFn: (payload: { conversationId: string; name: string }) =>
      api.patch(`/chat/groups/${payload.conversationId}`, { name: payload.name }).then((res) => res.data),
    onSuccess: (_, payload) => {
      refreshActiveMessages(payload.conversationId);
      refreshConversations();
      toast.success('Đã đổi tên nhóm');
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Đổi tên nhóm thất bại'),
  });

  const addParticipants = useMutation({
    mutationFn: (payload: { conversationId: string; userIds: string[] }) =>
      api.post(`/chat/groups/${payload.conversationId}/participants`, { userIds: payload.userIds }).then((res) => res.data),
    onSuccess: (_, payload) => {
      refreshActiveMessages(payload.conversationId);
      refreshConversations();
      toast.success('Đã thêm thành viên');
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Thêm thành viên thất bại'),
  });

  const removeParticipant = useMutation({
    mutationFn: (payload: { conversationId: string; userId: string }) =>
      api.delete(`/chat/groups/${payload.conversationId}/participants/${payload.userId}`).then((res) => res.data),
    onSuccess: (_, payload) => {
      refreshActiveMessages(payload.conversationId);
      refreshConversations();
      if (payload.userId === currentUserId) toast.success('Bạn đã rời nhóm');
      else toast.success('Đã xóa thành viên');
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Cập nhật thành viên thất bại'),
  });

  return {
    startDirect,
    createGroup,
    sendMessage,
    markRead,
    renameGroup,
    addParticipants,
    removeParticipant,
  };
}
