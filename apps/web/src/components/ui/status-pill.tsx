import { cn } from '@/lib/utils';

export type StatusTone =
  | 'violet'
  | 'indigo'
  | 'cyan'
  | 'mint'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'pink'
  | 'muted';

const tones: Record<StatusTone, string> = {
  violet: 'bg-aurora-violet/10 text-aurora-violet',
  indigo: 'bg-aurora-indigo/10 text-aurora-indigo',
  cyan: 'bg-aurora-cyan/10 text-cyan-700 dark:text-aurora-cyan',
  mint: 'bg-aurora-mint/10 text-emerald-700 dark:text-aurora-mint',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  pink: 'bg-aurora-pink/10 text-aurora-pink',
  muted: 'bg-muted text-muted-foreground',
};

export interface StatusPillProps {
  tone?: StatusTone;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * StatusPill — pill bo tròn với dot prefix, dùng thống nhất cho mọi status badge.
 * Map ngữ nghĩa:
 *   violet  → Mới / Tiềm năng
 *   indigo  → Đang chăm / Đã liên hệ
 *   cyan    → Đủ điều kiện / Báo giá
 *   amber   → Đàm phán / Cần follow-up
 *   emerald → Won / Hoàn thành
 *   rose    → Lost / Mất / Quá hạn
 *   muted   → Pending / Bản nháp
 */
export function StatusPill({ tone = 'muted', dot = true, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
