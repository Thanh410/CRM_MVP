import type { QueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';

function getSocketBaseUrl() {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit?.startsWith('http')) {
    const url = new URL(explicit);
    url.pathname = url.pathname.replace(/\/api\/?$/, '');
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  }

  return 'http://localhost:3000';
}

export function connectChatRealtime(queryClient: QueryClient, token?: string | null) {
  if (typeof window === 'undefined' || !token) return undefined;

  const socket: Socket = io(`${getSocketBaseUrl()}/chat`, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket'],
    withCredentials: true,
    reconnection: true,
  });

  const refreshChat = (payload?: { conversationId?: string }) => {
    queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    queryClient.invalidateQueries({ queryKey: ['chat', 'unread-count'] });
    if (payload?.conversationId) {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', payload.conversationId] });
    }
  };

  socket.on('chat:message.created', refreshChat);
  socket.on('chat:conversation.updated', refreshChat);
  socket.on('chat:read.updated', refreshChat);
  socket.on('chat:participant.updated', refreshChat);

  return () => {
    socket.disconnect();
  };
}
