import { avatarGradientStyle } from '@/lib/avatar-color';
import { cn, getInitials } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
  xl: 'w-16 h-16 text-base',
};

export interface AvatarGradientProps {
  id: string;
  name: string;
  size?: Size;
  online?: boolean;
  className?: string;
  ring?: boolean;
}

/**
 * AvatarGradient — hiển thị avatar tròn với gradient HSL ổn định theo ID.
 * Cùng ID → cùng gradient. Đẹp hơn pastel 1-color cũ, sống động hơn ở list.
 *
 * - `online`: chấm xanh ở góc, animate breathe
 * - `ring`: ring mỏng 2px màu card-bg để stack đè được lên nhau
 */
export function AvatarGradient({
  id,
  name,
  size = 'md',
  online,
  className,
  ring,
}: AvatarGradientProps) {
  return (
    <div
      className={cn(
        'relative inline-grid place-items-center rounded-full font-bold text-white shrink-0',
        sizeMap[size],
        ring && 'ring-2 ring-card',
        className,
      )}
      style={avatarGradientStyle(id)}
    >
      {getInitials(name) || '?'}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-card breathe" />
      )}
    </div>
  );
}

/**
 * AvatarStack — chồng nhiều avatar lên nhau với negative margin.
 */
export function AvatarStack({
  items,
  max = 3,
  size = 'sm',
}: {
  items: { id: string; name: string }[];
  max?: number;
  size?: Size;
}) {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className="flex -space-x-1.5">
      {shown.map((it) => (
        <AvatarGradient key={it.id} id={it.id} name={it.name} size={size} ring />
      ))}
      {rest > 0 && (
        <div
          className={cn(
            'inline-grid place-items-center rounded-full bg-muted text-muted-foreground font-semibold ring-2 ring-card shrink-0',
            sizeMap[size],
          )}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
