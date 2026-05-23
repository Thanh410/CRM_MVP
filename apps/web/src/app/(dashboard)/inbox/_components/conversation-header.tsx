'use client';

import { Link2, UserRound, XCircle } from 'lucide-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { CHANNEL_META, getConversationName } from '../conversation-meta';
import type { Conversation } from '../types';
import { ConversationAvatar } from './conversation-avatar';

export function ConversationHeader({
  convo,
  users,
  contactSearch,
  contacts,
  onContactSearch,
  onAssign,
  onLinkContact,
  onClose,
  closing,
}: {
  convo: Conversation;
  users: Array<{ id: string; fullName: string }>;
  contactSearch: string;
  contacts: Array<{ id: string; fullName: string; email?: string | null }>;
  onContactSearch: (value: string) => void;
  onAssign: (userId: string) => void;
  onLinkContact: (contactId: string) => void;
  onClose: () => void;
  closing?: boolean;
}) {
  const name = getConversationName(convo);
  const channelMeta = CHANNEL_META[convo.channel] ?? CHANNEL_META.ZALO;
  const assignee = convo.assignee;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-3">
      <div className="flex min-w-0 items-center gap-3">
        <ConversationAvatar
          id={convo.contact?.id ?? convo.lead?.id ?? convo.id}
          name={name}
          channel={convo.channel}
        />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-medium">{channelMeta.label}</span>
            {convo.channelAccount?.name && <> · {convo.channelAccount.name}</>}
            {convo.status === 'OPEN' && <span className="ml-2 font-medium text-emerald-600">đang mở</span>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {assignee && <AvatarGradient id={assignee.id} name={assignee.fullName} size="xs" />}
          <select
            value={assignee?.id ?? ''}
            onChange={(event) => {
              if (event.target.value) onAssign(event.target.value);
            }}
            className="h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground/80 outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
          >
            <option value="">Gán agent...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName}
              </option>
            ))}
          </select>
        </div>

        <div className="relative flex items-center gap-1.5">
          {convo.contact ? (
            <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-aurora-violet/10 px-2 text-xs font-semibold text-aurora-violet">
              <UserRound className="h-3.5 w-3.5" />
              {convo.contact.fullName}
            </span>
          ) : (
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={contactSearch}
                onChange={(event) => onContactSearch(event.target.value)}
                placeholder="Tìm liên hệ..."
                className="h-8 w-36 rounded-lg border border-border bg-card pl-7 pr-2 text-xs outline-none transition focus:border-aurora-violet focus:ring-2 focus:ring-aurora-violet/15"
              />
              {contactSearch.trim().length >= 2 && contacts.length > 0 && (
                <div className="absolute left-0 top-full z-10 mt-1 max-h-44 w-56 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-lift">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => onLinkContact(contact.id)}
                      className="w-full px-3 py-2 text-left text-xs transition-colors hover:bg-aurora-soft/30 hover:text-aurora-violet"
                    >
                      {contact.fullName}
                      {contact.email && <span className="ml-1 text-muted-foreground">({contact.email})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {convo.status !== 'CLOSED' && (
          <RippleButton variant="outline" size="sm" onClick={onClose} disabled={closing}>
            <XCircle className="h-4 w-4" />
            Đóng hội thoại
          </RippleButton>
        )}
      </div>
    </div>
  );
}
