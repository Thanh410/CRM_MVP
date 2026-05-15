import type { LucideIcon } from 'lucide-react';
import { CountUp, type CountUpFormat } from './count-up';
import { Sparkline, type SparklineColor } from './sparkline';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: CountUpFormat;
  /** Suffix sau số (vd "tỷ", "%", "đ") */
  suffix?: string;
  delta?: { value: number; positive?: boolean };
  color?: SparklineColor;
  spark?: number[];
  /** Stagger delay cho reveal (ms) */
  delay?: number;
  className?: string;
}

/**
 * KpiCard — stat card với icon, số counter-up, delta badge và sparkline.
 * Có hover lift + aurora blob ở góc.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  format = 'int',
  suffix,
  delta,
  color = 'aurora-violet',
  spark,
  delay = 0,
  className,
}: KpiCardProps) {
  const isUp = delta ? (delta.positive ?? delta.value >= 0) : false;
  const tint = `hsl(var(--${color})/.10)`;
  const tintColor = `hsl(var(--${color}))`;

  return (
    <div
      className={cn(
        'card-glow reveal in p-5 relative overflow-hidden bg-card border border-border rounded-2xl shadow-soft',
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div
        className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
        style={{ background: tint }}
      />
      <div className="flex items-center justify-between relative">
        <div
          className="w-9 h-9 rounded-xl grid place-items-center"
          style={{ background: tint, color: tintColor }}
        >
          <Icon className="w-4 h-4" />
        </div>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              isUp
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
            )}
          >
            {isUp ? '↑' : '↓'} {Math.abs(delta.value)}%
          </span>
        )}
      </div>
      <div className="mt-4 font-display text-3xl font-bold">
        <CountUp to={value} format={format} />
        {suffix && <span className="text-lg text-muted-foreground"> {suffix}</span>}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {spark && (
        <div className="mt-3">
          <Sparkline data={spark} color={color} />
        </div>
      )}
    </div>
  );
}
