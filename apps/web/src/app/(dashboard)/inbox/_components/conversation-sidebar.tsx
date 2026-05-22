'use client';

import { Search } from 'lucide-react';
import {
  ASSIGNED_LABELS,
  CHANNEL_LABELS,
  STATUS_LABELS,
} from '../conversation-meta';
import type { Conversation, ConversationChannel, ConversationFilters, ConversationStatus, AssignedFilter } from '../types';
import { ConversationListItem } from './conversation-list-item';

const STATUSES: ConversationStatus[] = ['OPEN', 'PENDING', 'CLOSED'];
const CHANNELS: Array<'all' | ConversationChannel> = ['all', 'ZALO', 'MESSENGER'];
const ASSIGNED: AssignedFilter[] = ['all', 'me', 'unassigned'];

export function ConversationSidebar({
  conversations,
  isLoading,
  filters,
  activeId,
  onFiltersChange,
  onSelect,
}: {
  conversations?: Conversation[];
  isLoading: boolean;
  filters: ConversationFilters;
  activeId: string | null;
  onFiltersChange: (filters: ConversationFilters) => void;
  onSelect: (id: string) => void;
}) {
  const updateFilters = (patch: Partial<ConversationFilters>) => {
    onFiltersChange({ ...filters, ...patch });
  };

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-border">
      <div className="space-y-3 border-b border-border p-3">
        <div className="flex rounded-lg bg-muted p-0.5">
          {STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => updateFilters({ status })}
              className={`h-7 flex-1 rounded-md text-xs font-semibold transition ${
                filters.status === status ? 'btn-aurora text-white shadow-pop' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {STATUS_LABELS[status]}
              {filters.status === status && conversations ? ` · ${conversations.length}` : ''}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={filters.search}
            onChange={(event) => updateFilters({ search: event.target.value })}
            placeholder="Tìm hội thoại, khách hàng, tin nhắn..."
            className="h-9 w-full rounded-lg border border-border bg-card pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={filters.channel}
            onChange={(event) => updateFilters({ channel: event.target.value as ConversationFilters['channel'] })}
            className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
          >
            {CHANNELS.map((channel) => (
              <option key={channel} value={channel}>
                {CHANNEL_LABELS[channel]}
              </option>
            ))}
          </select>

          <select
            value={filters.assigned}
            onChange={(event) => updateFilters({ assigned: event.target.value as AssignedFilter })}
            className="h-9 rounded-lg border border-border bg-card px-2 text-xs text-foreground outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
          >
            {ASSIGNED.map((assigned) => (
              <option key={assigned} value={assigned}>
                {ASSIGNED_LABELS[assigned]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-aurora-violet border-t-transparent" />
          </div>
        ) : conversations?.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-foreground">Không có hội thoại</p>
            <p className="mt-1 text-xs text-muted-foreground">Thử đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
          </div>
        ) : (
          conversations?.map((convo) => (
            <ConversationListItem
              key={convo.id}
              convo={convo}
              isActive={activeId === convo.id}
              onClick={() => onSelect(convo.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
