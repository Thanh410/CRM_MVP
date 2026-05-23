import { StatusPill } from '@/components/ui/status-pill';
import { formatConversationTime, getConversationName, STATUS_LABELS, STATUS_TONES } from '../conversation-meta';
import type { Conversation } from '../types';
import { ConversationAvatar } from './conversation-avatar';

export function ConversationListItem({
  convo,
  isActive,
  onClick,
}: {
  convo: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  const name = getConversationName(convo);
  const lastMsg = convo.messages?.[0];

  return (
    <button
      onClick={onClick}
      className={`w-full border-b border-border p-3 text-left transition-colors ${
        isActive ? 'border-l-2 border-l-aurora-violet bg-aurora-soft/40' : 'hover:bg-aurora-soft/30'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <ConversationAvatar
          id={convo.contact?.id ?? convo.lead?.id ?? convo.id}
          name={name}
          channel={convo.channel}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {formatConversationTime(convo.lastMessageAt)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {lastMsg?.content || 'Chưa có tin nhắn'}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <StatusPill tone={STATUS_TONES[convo.status] ?? 'muted'}>
              {STATUS_LABELS[convo.status]}
            </StatusPill>
            {convo.assignee && (
              <span className="truncate text-[10px] text-muted-foreground">
                {convo.assignee.fullName}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
