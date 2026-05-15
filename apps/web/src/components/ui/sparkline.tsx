'use client';

import { useId } from 'react';
import { useReveal } from '@/hooks/use-reveal';

export type SparklineColor =
  | 'aurora-violet'
  | 'aurora-indigo'
  | 'aurora-cyan'
  | 'aurora-mint'
  | 'aurora-pink'
  | 'aurora-rose'
  | 'aurora-amber';

export interface SparklineProps {
  data: number[];
  color?: SparklineColor;
  height?: number;
  /** Stroke width — mặc định 2, dùng 1.5 cho mini */
  strokeWidth?: number;
  /** Show area fill bên dưới line */
  area?: boolean;
}

/**
 * Sparkline — SVG line chart nhỏ với gradient stroke + draw animation.
 * Tự reveal khi vào viewport (chỉ chạy 1 lần).
 */
export function Sparkline({
  data,
  color = 'aurora-violet',
  height = 40,
  strokeWidth = 2,
  area = false,
}: SparklineProps) {
  const id = useId();
  const { ref, visible } = useReveal<SVGSVGElement>();

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = height;
  const padTop = 2;
  const padBot = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - padTop - padBot) - padBot;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M ${points.join(' L ')}`;
  const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor={`hsl(var(--${color}))`} />
          <stop offset="100%" stopColor="hsl(var(--aurora-pink))" />
        </linearGradient>
        {area && (
          <linearGradient id={`sgf-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={`hsl(var(--${color}))`} stopOpacity={0.25} />
            <stop offset="100%" stopColor={`hsl(var(--${color}))`} stopOpacity={0} />
          </linearGradient>
        )}
      </defs>
      {area && <path d={areaPath} fill={`url(#sgf-${id})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={`url(#sg-${id})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={visible ? 'spark-path' : ''}
      />
    </svg>
  );
}
