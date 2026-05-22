import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { CHANNEL_META } from '../conversation-meta';
import type { ConversationChannel } from '../types';

export function ConversationAvatar({
  id,
  name,
  channel,
  size = 'md',
}: {
  id: string;
  name: string;
  channel: ConversationChannel;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const meta = CHANNEL_META[channel] ?? CHANNEL_META.ZALO;

  return (
    <div className="relative shrink-0">
      <AvatarGradient id={id} name={name} size={size} />
      <span
        className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[8px] font-bold text-white ring-2 ring-card ${meta.bg}`}
        title={meta.label}
      >
        {meta.marker}
      </span>
    </div>
  );
}
