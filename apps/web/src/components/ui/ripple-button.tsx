'use client';

import { forwardRef, useRef, type ButtonHTMLAttributes, type MouseEvent } from 'react';
import { cn } from '@/lib/utils';

export type RippleButtonVariant = 'aurora' | 'solid' | 'outline' | 'ghost' | 'danger';
export type RippleButtonSize = 'sm' | 'md' | 'lg';

const variantClass: Record<RippleButtonVariant, string> = {
  aurora: 'btn-aurora text-white shadow-pop hover:shadow-lift',
  solid: 'bg-primary text-primary-foreground hover:opacity-90',
  outline: 'border border-border bg-card hover:bg-muted text-foreground',
  ghost: 'hover:bg-muted text-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

const sizeClass: Record<RippleButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

export interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RippleButtonVariant;
  size?: RippleButtonSize;
}

export const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  function RippleButton(
    { className, variant = 'aurora', size = 'md', children, onClick, ...rest },
    ref,
  ) {
    const innerRef = useRef<HTMLButtonElement | null>(null);

    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      const el = innerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const wave = document.createElement('span');
        wave.className = 'rip-wave';
        const sizePx = Math.max(rect.width, rect.height);
        wave.style.width = `${sizePx}px`;
        wave.style.height = `${sizePx}px`;
        wave.style.left = `${e.clientX - rect.left - sizePx / 2}px`;
        wave.style.top = `${e.clientY - rect.top - sizePx / 2}px`;
        el.appendChild(wave);
        window.setTimeout(() => wave.remove(), 700);
      }
      onClick?.(e);
    };

    return (
      <button
        ref={(el) => {
          innerRef.current = el;
          if (typeof ref === 'function') ref(el);
          else if (ref) ref.current = el;
        }}
        className={cn(
          'rip inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:pointer-events-none',
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        onClick={handleClick}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
