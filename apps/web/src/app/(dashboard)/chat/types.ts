'use client';

export interface ChatUser {
  id: string;
  fullName: string;
  email: string;
  avatar?: string | null;
  jobTitle?: string | null;
}

export interface ChatParticipant {
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt?: string;
  lastReadAt?: string | null;
  user: ChatUser;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  sentAt: string;
  createdAt?: string;
  sender?: Pick<ChatUser, 'id' | 'fullName' | 'avatar'> | null;
}

export interface ChatConversation {
  id: string;
  kind: 'DIRECT' | 'GROUP';
  subject?: string | null;
  lastMessageAt?: string | null;
  lastReadAt?: string | null;
  unreadCount: number;
  myRole?: 'ADMIN' | 'MEMBER';
  participants: ChatParticipant[];
  messages?: ChatMessage[];
  _count?: { messages: number };
}

export interface ChatUnreadCountResponse {
  count: number;
}

export type ChatKindFilter = 'all' | 'direct' | 'group';
