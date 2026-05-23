import type { ConversationChannel, ConversationStatus } from './types';
import type { StatusTone } from '@/components/ui/status-pill';

export const CHANNEL_META: Record<ConversationChannel, { bg: string; marker: string; label: string }> = {
  ZALO: { bg: 'bg-sky-500', marker: 'Z', label: 'Zalo' },
  MESSENGER: { bg: 'bg-blue-600', marker: 'M', label: 'Messenger' },
};

export const STATUS_TONES: Record<ConversationStatus, StatusTone> = {
  OPEN: 'emerald',
  PENDING: 'amber',
  CLOSED: 'muted',
};

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: 'Mở',
  PENDING: 'Chờ',
  CLOSED: 'Đóng',
};

export const CHANNEL_LABELS: Record<'all' | ConversationChannel, string> = {
  all: 'Tất cả kênh',
  ZALO: 'Zalo',
  MESSENGER: 'Messenger',
};

export const ASSIGNED_LABELS = {
  all: 'Tất cả phụ trách',
  me: 'Của tôi',
  unassigned: 'Chưa gán',
} as const;

export function formatConversationTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function getConversationName(convo: {
  contact?: { fullName: string } | null;
  lead?: { fullName: string } | null;
}) {
  return convo.contact?.fullName ?? convo.lead?.fullName ?? 'Khách hàng';
}
