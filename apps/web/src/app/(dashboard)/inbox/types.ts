export type ConversationChannel = 'ZALO' | 'MESSENGER';
export type ConversationStatus = 'OPEN' | 'PENDING' | 'CLOSED';
export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type AssignedFilter = 'all' | 'me' | 'unassigned';

export interface Message {
  id: string;
  direction: MessageDirection;
  content?: string | null;
  mediaUrl?: string | null;
  sentAt: string;
}

export interface ConversationPerson {
  id: string;
  fullName: string;
  avatar?: string | null;
  phone?: string | null;
}

export interface Conversation {
  id: string;
  channel: ConversationChannel;
  status: ConversationStatus;
  lastMessageAt?: string | null;
  contact?: ConversationPerson | null;
  lead?: ConversationPerson | null;
  assignee?: ConversationPerson | null;
  assignedTo?: string | null;
  channelAccount?: { id: string; name: string; channel: string; isActive?: boolean };
  messages?: Message[];
  _count?: { messages: number };
}

export interface ConversationFilters {
  status: ConversationStatus;
  channel: 'all' | ConversationChannel;
  assigned: AssignedFilter;
  search: string;
}
