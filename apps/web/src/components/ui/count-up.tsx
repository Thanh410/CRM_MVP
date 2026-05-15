'use client';

import { useEffect, useState } from 'react';
import { useReveal } from '@/hooks/use-reveal';

export type CountUpFormat = 'int' | 'comma' | 'decimal' | 'percent';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export interface CountUpProps {
  to: number;
  format?: CountUpFormat;
  duration?: number;
  /** Khi false → bỏ animation, hiển thị số luôn (dùng cho server-rendered fallback). */
  animate?: boolean;
}

/**
 * CountUp — tween số từ 0 → to khi vào viewport.
 * - format='comma' → 1.234 (vi-VN)
 * - format='decimal' → 4.5
 * - format='percent' → 68
 */
export function CountUp({ to, format = 'int', duration = 1400, animate = true }: CountUpProps) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [v, setV] = useState(animate ? 0 : to);

  useEffect(() => {
    if (!animate || !visible) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setV(to * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration, animate]);

  const display =
    format === 'comma' ? Math.round(v).toLocaleString('vi-VN')
    : format === 'decimal' ? v.toFixed(1)
    : Math.round(v).toString();

  return <span ref={ref}>{display}</span>;
}
