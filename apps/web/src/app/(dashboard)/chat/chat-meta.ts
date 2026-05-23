import type { ChatConversation } from './types';

export const KIND_LABELS = {
  all: 'Tất cả',
  direct: 'Tin nhắn riêng',
  group: 'Nhóm',
  unread: 'Chưa đọc',
} as const;

export function getConversationTitle(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.kind === 'GROUP') return conversation.subject || 'Nhóm chưa đặt tên';
  const other = conversation.participants.find((participant) => participant.userId !== currentUserId);
  return other?.user.fullName ?? 'Chat cá nhân';
}

export function getConversationSubtitle(conversation: ChatConversation, currentUserId?: string) {
  if (conversation.kind === 'GROUP') return `${conversation.participants.length} thành viên`;
  const other = conversation.participants.find((participant) => participant.userId !== currentUserId);
  return other?.user.email ?? 'Hội thoại nội bộ';
}

export function formatChatTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function formatChatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getOtherParticipant(conversation: ChatConversation, currentUserId?: string) {
  return conversation.participants.find((participant) => participant.userId !== currentUserId);
}
