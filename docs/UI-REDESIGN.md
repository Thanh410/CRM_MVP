# Aurora CRM — UI Redesign Spec

> Tài liệu thực thi để chuyển toàn bộ UI từ bản **Linear/Vercel-mono** hiện tại sang **Aurora** (gradient tinh tế + motion sinh động).
> Preview tham khảo: [`docs/ui/redesign-preview/index.html`](./ui/redesign-preview/index.html)
> Bản UI hiện tại: [`docs/UI.md`](./UI.md)

**Stack giữ nguyên:** Next.js 14 App Router · React 18 · Tailwind 3.4 · Radix UI · recharts · cmdk · vaul · @dnd-kit · sonner · lucide-react · next-themes

**Không thêm dependency mới.** Toàn bộ motion dùng CSS + 1 IntersectionObserver hook. Counter-up dùng `requestAnimationFrame` không cần lib.

---

## Mục lục

1. [Nguyên tắc thiết kế](#1-nguyên-tắc-thiết-kế)
2. [Design tokens](#2-design-tokens)
3. [Motion tokens](#3-motion-tokens)
4. [Component spec](#4-component-spec)
5. [Component mới cần tạo](#5-component-mới-cần-tạo)
6. [Migration checklist theo trang](#6-migration-checklist-theo-trang)
7. [Sample code — pattern khó](#7-sample-code--pattern-khó)
8. [Phases triển khai](#8-phases-triển-khai)
9. [Acceptance criteria](#9-acceptance-criteria)

---

## 1. Nguyên tắc thiết kế

| Nguyên tắc | Thực thi |
|---|---|
| **Aurora as accent, not noise** | Gradient `violet → cyan → pink` chỉ dùng cho: primary CTA, sidebar glow, active nav, KPI sparkline, kanban Won card. Body và table giữ neutral. |
| **Hierarchy mạnh hơn** | Display font (`Plus Jakarta Sans`) cho headings/numbers, `Inter` cho body. Spacing 8pt grid giữ nguyên. |
| **Motion phục vụ feedback, không trang trí** | Mọi animation đều có lý do: counter-up = "đây là số thật", reveal = "có dữ liệu mới load", typing dots = "user đang gõ". Tránh idle motion liên tục trừ aurora-shift của sidebar (rất chậm 14s). |
| **Reduced-motion respect** | `@media (prefers-reduced-motion: reduce)` tắt hết animation. Bắt buộc. |
| **Backwards-compat tokens** | Giữ tên CSS var `--background`, `--foreground`, `--primary`... — chỉ đổi giá trị HSL, không rename. Component cũ không vỡ. |
| **Dark mode parity** | Mọi token, mọi component phải có cặp light/dark. Test ở cả 2 chế độ. |

---

## 2. Design tokens

### 2.1 CSS variables — sửa [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css)

```css
@layer base {
  :root {
    /* === Neutral (giữ tên cũ, chỉ tinh chỉnh giá trị) === */
    --background: 240 20% 98%;          /* trước: 0 0% 100% — hơi tím nhạt */
    --foreground: 240 25% 9%;           /* trước: 240 10% 3.9% — sâu hơn xíu */
    --card: 0 0% 100%;
    --card-foreground: 240 25% 9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 25% 9%;
    --primary: 252 78% 67%;             /* TRƯỚC: zinc-900. SAU: aurora-violet */
    --primary-foreground: 0 0% 100%;
    --secondary: 240 12% 96%;
    --secondary-foreground: 240 25% 14%;
    --muted: 240 12% 96%;
    --muted-foreground: 240 8% 45%;
    --accent: 240 12% 96%;
    --accent-foreground: 240 25% 14%;
    --destructive: 350 89% 60%;         /* aurora-rose */
    --destructive-foreground: 0 0% 100%;
    --border: 240 14% 92%;
    --input: 240 14% 92%;
    --ring: 252 78% 67%;                /* aurora-violet ring thay vì zinc */
    --radius: 0.75rem;                  /* TRƯỚC: 0.375rem — bo mềm hơn */

    /* === NEW: aurora palette === */
    --aurora-violet: 252 78% 67%;
    --aurora-indigo: 234 100% 68%;
    --aurora-cyan:   186 73% 55%;
    --aurora-mint:   159 75% 57%;
    --aurora-pink:   330 100% 72%;
    --aurora-amber:  35  100% 64%;
    --aurora-rose:   350 89%  60%;

    /* === NEW: surface elevation === */
    --surface-1: 0 0% 100%;
    --surface-2: 240 20% 99%;
    --surface-3: 240 25% 97%;

    /* === NEW: sidebar (luôn dark, có aurora glow) === */
    --sidebar-bg: 240 30% 5%;
    --sidebar-fg: 0 0% 95%;
    --sidebar-muted: 240 10% 60%;
  }

  .dark {
    --background: 240 25% 6%;
    --foreground: 0 0% 96%;
    --card: 240 22% 9%;
    --card-foreground: 0 0% 96%;
    --popover: 240 22% 9%;
    --popover-foreground: 0 0% 96%;
    --primary: 252 78% 70%;
    --primary-foreground: 240 30% 5%;
    --secondary: 240 14% 14%;
    --secondary-foreground: 0 0% 96%;
    --muted: 240 14% 14%;
    --muted-foreground: 240 8% 60%;
    --accent: 240 14% 14%;
    --accent-foreground: 0 0% 96%;
    --destructive: 350 75% 55%;
    --destructive-foreground: 0 0% 100%;
    --border: 240 12% 18%;
    --input: 240 12% 18%;
    --ring: 252 78% 70%;

    --surface-1: 240 22% 9%;
    --surface-2: 240 24% 7%;
    --surface-3: 240 26% 5%;
  }
}
```

### 2.2 Tailwind config — sửa [`apps/web/tailwind.config.js`](apps/web/tailwind.config.js)

Thêm vào `theme.extend`:

```js
fontFamily: {
  sans:    ['Inter', 'Be Vietnam Pro', 'ui-sans-serif', 'system-ui'],
  display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
},
colors: {
  // ...giữ nguyên các color hiện có...
  aurora: {
    violet: 'hsl(var(--aurora-violet))',
    indigo: 'hsl(var(--aurora-indigo))',
    cyan:   'hsl(var(--aurora-cyan))',
    mint:   'hsl(var(--aurora-mint))',
    pink:   'hsl(var(--aurora-pink))',
    amber:  'hsl(var(--aurora-amber))',
    rose:   'hsl(var(--aurora-rose))',
  },
  surface: {
    1: 'hsl(var(--surface-1))',
    2: 'hsl(var(--surface-2))',
    3: 'hsl(var(--surface-3))',
  },
  sidebar: {
    DEFAULT: 'hsl(var(--sidebar-bg))',
    fg:      'hsl(var(--sidebar-fg))',
    muted:   'hsl(var(--sidebar-muted))',
  },
},
backgroundImage: {
  'aurora':      'linear-gradient(135deg, hsl(var(--aurora-violet)) 0%, hsl(var(--aurora-cyan)) 50%, hsl(var(--aurora-pink)) 100%)',
  'aurora-soft': 'linear-gradient(135deg, hsl(var(--aurora-violet)/.18) 0%, hsl(var(--aurora-cyan)/.12) 50%, hsl(var(--aurora-pink)/.18) 100%)',
  'mesh':        'radial-gradient(at 10% 0%,  hsl(var(--aurora-violet)/.18) 0px, transparent 50%), radial-gradient(at 90% 0%, hsl(var(--aurora-cyan)/.14) 0px, transparent 50%), radial-gradient(at 50% 100%, hsl(var(--aurora-pink)/.12) 0px, transparent 50%)',
},
boxShadow: {
  soft:  '0 1px 2px rgba(16,16,25,.04), 0 4px 16px rgba(16,16,25,.04)',
  pop:   '0 8px 28px -8px hsl(var(--aurora-violet)/.35)',
  glass: 'inset 0 1px 0 rgba(255,255,255,.08), 0 8px 32px rgba(8,8,15,.45)',
  'lift': '0 10px 30px -10px hsl(var(--aurora-violet)/.18), 0 4px 14px hsl(var(--aurora-cyan)/.10)',
},
borderRadius: {
  // tận dụng --radius mới = 0.75rem
  // không thêm token, chỉ dùng rounded-lg/xl/2xl của Tailwind là đủ
},
```

### 2.3 Typography hierarchy

| Use | Class |
|---|---|
| Page title (h1) | `text-2xl font-bold display tracking-tight` |
| Section header (h2) | `text-base font-bold display` |
| Card title (h3) | `text-sm font-bold display` |
| KPI number | `display text-3xl font-bold` |
| Body | `text-sm text-foreground` |
| Secondary | `text-xs text-muted-foreground` |
| Label uppercase | `text-[10px] font-semibold uppercase tracking-wider text-muted-foreground` |

Inter cần thêm font weight `400, 500, 600, 700`. Plus Jakarta Sans cần `600, 700, 800`. Cập nhật [`apps/web/src/app/layout.tsx`](apps/web/src/app/layout.tsx):

```tsx
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

const display = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-display',
  weight: ['600', '700', '800'],
});

// <html className={`${inter.variable} ${display.variable}`}>
```

Trong `tailwind.config.js`, đổi `fontFamily`:
```js
sans:    ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
```

---

## 3. Motion tokens

### 3.1 Motion CSS — thêm vào cuối [`apps/web/src/app/globals.css`](apps/web/src/app/globals.css)

```css
/* ===== MOTION TOKENS ===== */
@layer utilities {
  /* easings */
  .ease-spring { transition-timing-function: cubic-bezier(.2,.8,.2,1); }
  .ease-out-cubic { transition-timing-function: cubic-bezier(.33,1,.68,1); }

  /* hover lift utility */
  .hover-lift { @apply transition-transform duration-300 ease-spring will-change-transform; }
  .hover-lift:hover { transform: translateY(-3px); box-shadow: 0 10px 30px -10px hsl(var(--aurora-violet)/.18); }

  /* card with aurora glow on hover */
  .card-glow { @apply transition-shadow duration-300; }
  .card-glow:hover { box-shadow: 0 10px 30px -10px hsl(var(--aurora-violet)/.18), 0 4px 14px hsl(var(--aurora-cyan)/.10); }

  /* aurora animated bg for primary buttons */
  .btn-aurora {
    background: linear-gradient(135deg, hsl(var(--aurora-violet)) 0%, hsl(var(--aurora-cyan)) 50%, hsl(var(--aurora-pink)) 100%);
    background-size: 200% 200%;
    animation: aurora-bgshift 6s ease infinite;
  }
  @keyframes aurora-bgshift {
    0%,100% { background-position:   0% 50%; }
    50%     { background-position: 100% 50%; }
  }

  /* sidebar aurora glow drift */
  .aurora-glow {
    position: relative;
    overflow: hidden;
  }
  .aurora-glow::before {
    content: '';
    position: absolute; inset: -20%;
    pointer-events: none;
    background:
      radial-gradient(40% 30% at 20% 10%, hsl(var(--aurora-violet)/.30), transparent 60%),
      radial-gradient(35% 25% at 80% 90%, hsl(var(--aurora-cyan)/.22), transparent 60%),
      radial-gradient(30% 20% at 50% 50%, hsl(var(--aurora-pink)/.15), transparent 60%);
    animation: aurora-drift 14s ease-in-out infinite alternate;
  }
  @keyframes aurora-drift {
    0%   { transform: translate(0,0) rotate(0deg); }
    100% { transform: translate(8%,-6%) rotate(8deg); }
  }

  /* shimmer sweep — for active nav, won card */
  .shimmer { position: relative; overflow: hidden; }
  .shimmer::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,.18) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: shimmer-sweep 4s ease-in-out infinite;
  }
  @keyframes shimmer-sweep {
    0% { transform: translateX(-100%); }
    60%,100% { transform: translateX(100%); }
  }

  /* shine — wider/slower for featured items */
  .shine { position: relative; overflow: hidden; }
  .shine::after {
    content: ''; position: absolute; top: -50%; left: -60%; width: 50%; height: 200%;
    background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,.55) 50%, transparent 70%);
    transform: rotate(20deg);
    animation: shine-move 3.4s ease-in-out infinite;
  }
  @keyframes shine-move {
    0% { left: -60%; }
    60%,100% { left: 120%; }
  }

  /* pulse ping — for unread badge */
  .ping-ring { animation: ping-ring 1.8s ease-out infinite; }
  @keyframes ping-ring {
    0%   { box-shadow: 0 0 0 0   hsl(var(--aurora-rose)/.55); }
    70%  { box-shadow: 0 0 0 10px hsl(var(--aurora-rose)/0); }
    100% { box-shadow: 0 0 0 0   hsl(var(--aurora-rose)/0); }
  }

  /* breathe — for online dot */
  .breathe { animation: breathe 2.4s ease-in-out infinite; }
  @keyframes breathe {
    0%,100% { transform: scale(1);    opacity: 1; }
    50%     { transform: scale(1.15); opacity: .7; }
  }

  /* typing dots */
  .typing-dot {
    width: 6px; height: 6px; border-radius: 9999px;
    background: hsl(var(--muted-foreground));
    animation: typing 1.2s ease-in-out infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: .15s; }
  .typing-dot:nth-child(3) { animation-delay: .3s; }
  @keyframes typing {
    0%,60%,100% { transform: translateY(0);   opacity: .4; }
    30%         { transform: translateY(-4px); opacity: 1; }
  }

  /* reveal — JS adds .in when in view */
  .reveal { opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s cubic-bezier(.2,.8,.2,1); }
  .reveal.in { opacity: 1; transform: none; }

  /* sparkline path draw */
  .spark-path { stroke-dasharray: 200; stroke-dashoffset: 200; animation: spark-dash 1.6s .4s ease forwards; }
  @keyframes spark-dash { to { stroke-dashoffset: 0; } }

  /* deal card kanban hover */
  .deal-card { @apply transition-all duration-300 ease-spring; }
  .deal-card:hover {
    transform: translateY(-4px) rotate(-.6deg);
    box-shadow: 0 14px 34px -10px hsl(var(--aurora-violet)/.30);
  }

  /* wiggle — trophy on hover parent */
  .deal-card:hover .wiggle { animation: wiggle .6s ease; }
  @keyframes wiggle {
    0%,100% { transform: rotate(0); }
    25%     { transform: rotate(-12deg); }
    75%     { transform: rotate(12deg); }
  }

  /* ripple click */
  .rip { position: relative; overflow: hidden; }
  .rip-wave {
    position: absolute; border-radius: 9999px; pointer-events: none;
    background: rgba(255,255,255,.4); transform: scale(0); opacity: .7;
    animation: ripple .6s ease-out forwards;
  }
  @keyframes ripple { to { transform: scale(4); opacity: 0; } }
}

/* respect reduced motion — bắt buộc */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

### 3.2 Motion principles

| Loại | Khi dùng | Ví dụ |
|---|---|---|
| **Idle (loop)** | Brand presence, ambient | sidebar `aurora-drift`, primary button `aurora-bgshift`, won card `shine`, badge `ping-ring`, online dot `breathe` |
| **Reveal (1-shot trên enter)** | Khi data load xong / scroll vào view | KPI counter-up, funnel bars grow, sparkline draw, card stagger fade-up |
| **Hover** | Affordance | card lift, deal-card lift+rotate, pill lift, row arrow slide |
| **Click** | Confirm action | `rip` ripple wave |
| **State change** | Status feedback | typing dots khi user đang gõ (Inbox), shimmer khi nav active |

**Rule:** Không có hơn **2 idle animation** trong 1 viewport bất kỳ. Stagger reveal stop sau 1s.

---

## 4. Component spec

### 4.1 Component CŨ — chỉ cần restyle, không đổi API

| Component | File | Đổi gì |
|---|---|---|
| **Sidebar** | [`apps/web/src/components/layout/sidebar.tsx`](apps/web/src/components/layout/sidebar.tsx) | Thêm class `aurora-glow` vào root. Active item dùng class `nav-item-active` (background gradient + shimmer). Logo "C" → "A" với bg `bg-aurora`. |
| **Header** | [`apps/web/src/components/layout/header.tsx`](apps/web/src/components/layout/header.tsx) | Search trigger giữ nguyên. Notification bell wrap span `ping-ring` khi có unread. Avatar user dùng `AvatarGradient`. |
| **Skeleton** | [`apps/web/src/components/ui/skeleton.tsx`](apps/web/src/components/ui/skeleton.tsx) | Đổi `bg-muted animate-pulse` thành shimmer gradient (`bg-gradient-to-r from-muted via-surface-2 to-muted bg-[length:200%_100%] animate-[skel_1.4s_linear_infinite]`). |
| **EmptyState** | [`apps/web/src/components/ui/empty-state.tsx`](apps/web/src/components/ui/empty-state.tsx) | Icon container đổi sang gradient soft (`bg-aurora-soft`). Hint list giữ nguyên. CTA primary dùng `btn-aurora rip`. |
| **TagSelector** | [`apps/web/src/components/tag-selector.tsx`](apps/web/src/components/tag-selector.tsx) | Tag pill bo `rounded-full`, color HSL seeded. Add tag button có ring dashed. |
| **DatePicker** | [`apps/web/src/components/ui/date-picker.tsx`](apps/web/src/components/ui/date-picker.tsx) | Trigger button dùng border + radius mới. Selected date trong calendar có `bg-aurora`. |
| **CommandPalette** | [`apps/web/src/components/ui/command-palette.tsx`](apps/web/src/components/ui/command-palette.tsx) | Item highlighted dùng `bg-aurora-soft`. Group heading giữ nguyên. |
| **EntityTimeline** | [`apps/web/src/components/entity-timeline.tsx`](apps/web/src/components/entity-timeline.tsx) | Timeline dot có ring color theo activity type. Body card dùng `card` style mới. |

### 4.2 Status pill matrix (chuẩn hóa)

| Status | Class |
|---|---|
| Mới / Tiềm năng | `bg-aurora-violet/10 text-aurora-violet` |
| Đang chăm / Đã liên hệ | `bg-aurora-indigo/10 text-aurora-indigo` |
| Đủ điều kiện / Báo giá | `bg-aurora-cyan/10 text-cyan-700` |
| Đàm phán / Cần follow-up | `bg-amber-50 text-amber-700` |
| Won / Đủ điều kiện | `bg-emerald-50 text-emerald-700` |
| Lost / Mất / Quá hạn | `bg-rose-50 text-rose-700` |
| Pending / Bản nháp | `bg-muted text-muted-foreground` |

Mỗi pill prefix dot `●` cùng màu text. Bo `rounded-full px-2.5 py-0.5 text-[11px] font-semibold`.

### 4.3 Avatar — mọi nơi dùng gradient HSL seeded

[`apps/web/src/lib/avatar-color.ts`](apps/web/src/lib/avatar-color.ts) hiện trả về 1 màu HSL. Mở rộng để trả gradient 2-stop:

```ts
export function getAvatarGradient(id: string): { from: string; to: string } {
  const h1 = fnv1a(id) % 360;
  const h2 = (h1 + 40) % 360;
  return {
    from: `hsl(${h1} 75% 60%)`,
    to:   `hsl(${h2} 80% 65%)`,
  };
}

export function avatarGradientStyle(id: string): React.CSSProperties {
  const { from, to } = getAvatarGradient(id);
  return { background: `linear-gradient(135deg, ${from}, ${to})` };
}
```

Component mới `AvatarGradient` xem mục 5.1.

---

## 5. Component mới cần tạo

### 5.1 `AvatarGradient` — `apps/web/src/components/ui/avatar-gradient.tsx`

```tsx
import { avatarGradientStyle } from '@/lib/avatar-color';
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Size = 'xs' | 'sm' | 'md' | 'lg';
const sizeMap: Record<Size, string> = {
  xs: 'w-5 h-5 text-[9px]',
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

export function AvatarGradient({
  id, name, size = 'md', online, className,
}: {
  id: string; name: string; size?: Size; online?: boolean; className?: string;
}) {
  return (
    <div className={cn('relative inline-grid place-items-center rounded-full font-bold text-white shrink-0', sizeMap[size], className)} style={avatarGradientStyle(id)}>
      {getInitials(name)}
      {online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-card breathe" />}
    </div>
  );
}
```

### 5.2 `Sparkline` — `apps/web/src/components/ui/sparkline.tsx`

```tsx
'use client';
import { useId } from 'react';
import { useReveal } from '@/hooks/use-reveal';

export function Sparkline({
  data, color = 'aurora-violet', height = 40,
}: { data: number[]; color?: string; height?: number; }) {
  const id = useId();
  const { ref, visible } = useReveal();
  const max = Math.max(...data), min = Math.min(...data);
  const w = 100, h = height;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(' L ');
  return (
    <svg ref={ref} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`sg-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor={`hsl(var(--${color}))`} />
          <stop offset="100%" stopColor="hsl(var(--aurora-pink))" />
        </linearGradient>
      </defs>
      <path d={`M ${points}`} fill="none" stroke={`url(#sg-${id})`} strokeWidth={2} strokeLinecap="round"
        className={visible ? 'spark-path' : ''}
      />
    </svg>
  );
}
```

### 5.3 `KpiCard` — `apps/web/src/components/ui/kpi-card.tsx`

```tsx
import { Sparkline } from './sparkline';
import { CountUp } from './count-up';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KpiCard({
  icon: Icon, label, value, format = 'int', delta, color = 'aurora-violet', spark, delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: 'int' | 'comma' | 'decimal' | 'percent';
  delta?: { value: number; positive?: boolean };
  color?: 'aurora-violet'|'aurora-cyan'|'aurora-mint'|'aurora-rose';
  spark?: number[];
  delay?: number;
}) {
  const isUp = delta ? (delta.positive ?? delta.value >= 0) : false;
  return (
    <div className="card card-glow reveal p-5 relative overflow-hidden bg-card rounded-2xl shadow-soft" style={{ transitionDelay: `${delay}ms` }}>
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl" style={{ background: `hsl(var(--${color})/.10)` }} />
      <div className="flex items-center justify-between relative">
        <div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: `hsl(var(--${color})/.10)`, color: `hsl(var(--${color}))` }}>
          <Icon className="w-4 h-4" />
        </div>
        {delta && (
          <span className={cn('pill', isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
            {isUp ? '↑' : '↓'} {Math.abs(delta.value)}%
          </span>
        )}
      </div>
      <div className="mt-4 display text-3xl font-bold">
        <CountUp to={value} format={format} />
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {spark && <div className="mt-3"><Sparkline data={spark} color={color} /></div>}
    </div>
  );
}
```

### 5.4 `CountUp` — `apps/web/src/components/ui/count-up.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useReveal } from '@/hooks/use-reveal';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export function CountUp({
  to, format = 'int', duration = 1400,
}: { to: number; format?: 'int'|'comma'|'decimal'|'percent'; duration?: number; }) {
  const { ref, visible } = useReveal<HTMLSpanElement>();
  const [v, setV] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setV(to * easeOutCubic(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, to, duration]);

  const display = format === 'comma'   ? Math.round(v).toLocaleString('vi-VN')
                 : format === 'decimal' ? v.toFixed(1)
                 : Math.round(v).toString();

  return <span ref={ref}>{display}</span>;
}
```

### 5.5 `useReveal` hook — `apps/web/src/hooks/use-reveal.ts`

```ts
import { useEffect, useRef, useState } from 'react';

export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { threshold });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, visible };
}
```

### 5.6 `Ripple` mixin — `apps/web/src/components/ui/ripple-button.tsx`

```tsx
'use client';
import { forwardRef, useRef, MouseEvent } from 'react';
import { cn } from '@/lib/utils';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'aurora' | 'ghost' | 'outline' };

export const RippleButton = forwardRef<HTMLButtonElement, Props>(function RippleButton(
  { className, variant = 'aurora', children, onClick, ...rest }, ref
) {
  const btn = useRef<HTMLButtonElement>(null);
  const handle = (e: MouseEvent<HTMLButtonElement>) => {
    const el = btn.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const wave = document.createElement('span');
    wave.className = 'rip-wave';
    const size = Math.max(rect.width, rect.height);
    wave.style.width = wave.style.height = size + 'px';
    wave.style.left = (e.clientX - rect.left - size/2) + 'px';
    wave.style.top  = (e.clientY - rect.top  - size/2) + 'px';
    el.appendChild(wave);
    setTimeout(() => wave.remove(), 700);
    onClick?.(e);
  };
  return (
    <button
      ref={(el) => { btn.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; }}
      className={cn(
        'rip h-9 px-3 rounded-lg text-sm font-semibold transition',
        variant === 'aurora'  && 'btn-aurora text-white shadow-pop',
        variant === 'outline' && 'border border-border hover:bg-muted',
        variant === 'ghost'   && 'hover:bg-muted',
        className,
      )}
      onClick={handle}
      {...rest}
    >
      {children}
    </button>
  );
});
```

### 5.7 `StatusPill` — `apps/web/src/components/ui/status-pill.tsx`

```tsx
import { cn } from '@/lib/utils';

const tones = {
  violet: 'bg-aurora-violet/10 text-aurora-violet',
  indigo: 'bg-aurora-indigo/10 text-aurora-indigo',
  cyan:   'bg-aurora-cyan/10 text-cyan-700 dark:text-aurora-cyan',
  amber:  'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  emerald:'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  rose:   'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  muted:  'bg-muted text-muted-foreground',
} as const;

export function StatusPill({
  tone = 'muted', dot = true, children, className,
}: { tone?: keyof typeof tones; dot?: boolean; children: React.ReactNode; className?: string; }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold', tones[tone], className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
```

### 5.8 `KanbanColumnHeader` — `apps/web/src/components/ui/kanban-column-header.tsx`

```tsx
const stageStyles = {
  potential: 'from-aurora-violet/10 to-aurora-violet/5 ring-aurora-violet/20',
  contacted: 'from-aurora-indigo/10 to-aurora-cyan/10 ring-aurora-indigo/20',
  quoted:    'from-aurora-cyan/10 to-aurora-mint/10 ring-aurora-cyan/20',
  negotiate: 'from-amber-100 to-orange-100/60 ring-amber-300/40',
  won:       'from-emerald-100 to-emerald-50 ring-emerald-300/40',
  lost:      'from-rose-100 to-rose-50 ring-rose-300/40',
} as const;

const stageDot = {
  potential: 'bg-aurora-violet', contacted: 'bg-aurora-indigo',
  quoted: 'bg-aurora-cyan', negotiate: 'bg-amber-500',
  won: 'bg-emerald-500', lost: 'bg-rose-500',
};

export function KanbanColumnHeader({
  stage, name, count, valueLabel, onAdd,
}: { stage: keyof typeof stageStyles; name: string; count: number; valueLabel?: string; onAdd?: () => void; }) {
  return (
    <div className={`rounded-xl p-3 bg-gradient-to-br ring-1 ${stageStyles[stage]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${stageDot[stage]}`} />
          <span className="text-xs font-bold uppercase tracking-wide">{name}</span>
          <span className="text-[10px] font-bold opacity-70">{count}</span>
        </div>
        {onAdd && <button onClick={onAdd} className="opacity-70 hover:opacity-100">+</button>}
      </div>
      {valueLabel && <div className="text-[11px] text-muted-foreground mt-0.5">{valueLabel}</div>}
    </div>
  );
}
```

### 5.9 `RbacMatrix` — `apps/web/src/components/settings/rbac-matrix.tsx`

(Đã có RBAC matrix tristate hiện tại — chỉ restyle: header tô màu theo action, cell có background nhẹ theo state, hàng/cột counter theo `emerald/amber/muted`.)

Cell render:
```tsx
function Cell({ state }: { state: 'on' | 'off' | 'na' }) {
  if (state === 'na') return <div className="w-7 h-7 rounded-md bg-muted/40 text-muted-foreground/40 grid place-items-center mx-auto">—</div>;
  if (state === 'on') return <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 grid place-items-center mx-auto dark:bg-emerald-900/30">✓</div>;
  return <div className="w-7 h-7 rounded-md bg-muted text-muted-foreground/60 grid place-items-center mx-auto">○</div>;
}
```

### 5.10 `TypingDots` — `apps/web/src/components/ui/typing-dots.tsx`

```tsx
export function TypingDots() {
  return (
    <span className="inline-flex gap-1 items-center">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </span>
  );
}
```

---

## 6. Migration checklist theo trang

> Định dạng: `[ ]` = chưa làm. Mỗi item là 1 commit nhỏ.

### 6.1 Foundation (làm TRƯỚC, vì các trang khác phụ thuộc)

- [ ] `apps/web/src/app/globals.css` — cập nhật CSS vars + thêm motion tokens (mục 2.1, 3.1)
- [ ] `apps/web/tailwind.config.js` — extend colors + bg + shadow (mục 2.2)
- [ ] `apps/web/src/app/layout.tsx` — load Plus Jakarta Sans (mục 2.3)
- [ ] `apps/web/src/lib/avatar-color.ts` — thêm `getAvatarGradient`, `avatarGradientStyle` (mục 4.3)
- [ ] Tạo `apps/web/src/hooks/use-reveal.ts` (5.5)
- [ ] Tạo `apps/web/src/components/ui/avatar-gradient.tsx` (5.1)
- [ ] Tạo `apps/web/src/components/ui/sparkline.tsx` (5.2)
- [ ] Tạo `apps/web/src/components/ui/count-up.tsx` (5.4)
- [ ] Tạo `apps/web/src/components/ui/kpi-card.tsx` (5.3)
- [ ] Tạo `apps/web/src/components/ui/ripple-button.tsx` (5.6)
- [ ] Tạo `apps/web/src/components/ui/status-pill.tsx` (5.7)
- [ ] Tạo `apps/web/src/components/ui/kanban-column-header.tsx` (5.8)
- [ ] Tạo `apps/web/src/components/ui/typing-dots.tsx` (5.10)
- [ ] Smoke test ở dashboard — chỉ cần thấy aurora vars + font work

### 6.2 Layout

- [ ] `apps/web/src/components/layout/sidebar.tsx`:
  - [ ] Root: `bg-sidebar text-sidebar-fg aurora-glow relative overflow-hidden`
  - [ ] Logo container đổi từ "C" + zinc → "A" + `bg-aurora`
  - [ ] Active nav item: thêm class `nav-item-active shimmer`
  - [ ] User card đáy sidebar: dùng `AvatarGradient`
- [ ] `apps/web/src/components/layout/header.tsx`:
  - [ ] Notification bell wrap badge `ping-ring` khi `unread > 0`
  - [ ] Avatar góc phải dùng `AvatarGradient`
  - [ ] Thêm "+ Tạo nhanh" button `RippleButton variant="aurora"`

### 6.3 Auth

- [ ] `apps/web/src/app/(auth)/login/page.tsx`:
  - [ ] Đổi sang split layout 2 cột
  - [ ] Cột trái: `aurora-glow bg-mesh` + 2 floating blob
  - [ ] Cột phải: form, primary button dùng `RippleButton variant="aurora"`
  - [ ] Optional: thêm SSO button outline (giữ disabled nếu chưa có backend)

### 6.4 Dashboard — `apps/web/src/app/(dashboard)/dashboard/page.tsx`

- [ ] Greeting "Chào buổi sáng/chiều/tối, {firstName}" (theo `new Date().getHours()`)
- [ ] Date range tab group 7d/30d/Quý này
- [ ] 4 KPI cards → dùng `<KpiCard>` component (5.3) với `delay={0/120/190/260}`
- [ ] Phễu bán hàng:
  - [ ] Wrap trong `.reveal .funnel`
  - [ ] Mỗi bar `data-w="92%"` + JS grow trên reveal (xem mục 7.3)
  - [ ] Bar Won thêm class `shine`
- [ ] Lead theo nguồn: giữ recharts BarChart, chỉ đổi color sang aurora gradient
- [ ] Trạng thái Lead PieChart: đổi sang gradient stops
- [ ] Activity feed: avatar dùng `AvatarGradient`, mỗi activity item có dot color theo type
- [ ] "Hôm nay của bạn" — task list mới (xem mockup screen 02)

### 6.5 Leads — `apps/web/src/app/(dashboard)/leads/page.tsx`

- [ ] Toolbar:
  - [ ] Search input mở rộng full width với `kbd` shortcut hint
  - [ ] Filter dropdowns dạng button outline với caret
  - [ ] View switcher Bảng / Kanban / Card (chỉ Bảng implement, 2 cái sau placeholder)
  - [ ] Active filter chips dòng dưới với button "Xóa tất cả"
- [ ] Table:
  - [ ] Avatar column dùng `AvatarGradient`
  - [ ] Status column dùng `<StatusPill tone="...">`
  - [ ] Phụ trách column: avatar nhỏ + tên
  - [ ] Row hover: `hover:bg-aurora-soft/30`
- [ ] "+ Thêm lead" button: `RippleButton variant="aurora"`
- [ ] Pagination footer: pill button cho số trang active

### 6.6 Contacts / Companies / Users / Audit

Giống Leads — chỉ apply: `AvatarGradient`, `StatusPill`, `RippleButton`, hover row aurora-soft, toolbar pattern. Tạo 1 component generic `<EntityList>` nếu thấy lặp.

### 6.7 Deals Kanban — `apps/web/src/app/(dashboard)/deals/page.tsx`

- [ ] Filter pills row: dùng `chip-switch` với active = `bg-foreground text-background`
- [ ] Mỗi column dùng `<KanbanColumnHeader stage="potential|contacted|quoted|negotiate|won|lost">`
- [ ] Deal card:
  - [ ] Wrap class `card deal-card`
  - [ ] Số tiền display font, color theo stage
  - [ ] Footer: due date + assignees stack (max 3 + count)
  - [ ] Quá hạn → text rose
  - [ ] Won card: thêm `shine`, trophy `🏆 wiggle`
- [ ] Drag overlay: dùng class `deal-card shadow-pop` + `rotate-2`

### 6.8 Tasks Kanban — `apps/web/src/app/(dashboard)/tasks/page.tsx`

Giống Deals nhưng với 4 cột: `todo|inProgress|review|done`. Priority badge dùng `StatusPill`.

### 6.9 Marketing — `apps/web/src/app/(dashboard)/marketing/page.tsx`

- [ ] Tabs Chiến dịch / Templates: dùng underline animated
- [ ] Campaign card:
  - [ ] Channel icon row đầu với chip màu thương hiệu (xem inbox)
  - [ ] Status pill (Bản nháp/Đang chạy/Tạm dừng/Hoàn thành) dùng `<StatusPill>`
  - [ ] Metrics row: 4 mini stat (Sent/Open/Click/Bounce) format compact
  - [ ] Action button: Launch dùng `RippleButton variant="aurora"`

### 6.10 Inbox — `apps/web/src/app/(dashboard)/inbox/page.tsx`

- [ ] 3 cột: list 280 / thread 1fr / context 320
- [ ] Conv item:
  - [ ] Avatar dùng `AvatarGradient` size sm
  - [ ] Channel chip nhỏ ở avatar bottom-right (FB blue / Zalo sky / Email emerald / Messenger violet)
  - [ ] Active conv: border-l-2 violet + bg `aurora-soft/40`
  - [ ] Unread dot text aurora-pink
- [ ] Message thread:
  - [ ] Incoming bubble: `bg-card rounded-2xl rounded-tl-sm`
  - [ ] Outgoing bubble: `btn-aurora rounded-2xl rounded-tr-sm`
  - [ ] Typing indicator: `<TypingDots />` trong bubble nhỏ
  - [ ] Read receipt: ✓✓ text muted
- [ ] Composer:
  - [ ] Wrap `bg-muted rounded-2xl p-2`
  - [ ] Send button: `RippleButton variant="aurora"`
  - [ ] Quick action chips dưới composer (Snippet, AI suggest)
- [ ] Context panel:
  - [ ] Avatar lg + name display
  - [ ] Sections: Phụ trách / Tags / Deals / Activity với label uppercase tracking-wider

### 6.11 Settings — `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] Tab bar: underline color = aurora-violet
- [ ] Phân quyền tab → `<RbacMatrix>` mới (5.9)
  - [ ] Roles list bên trái: card có "color cap" gradient theo role
  - [ ] Matrix bên phải: header column tô màu theo action (Tạo violet / Xem emerald / Sửa amber / Xóa rose / Giao cyan)
  - [ ] Cell: `Cell({ state })` (5.9)
  - [ ] Footer: legend + "X thay đổi chưa lưu" badge

### 6.12 Mobile

- [ ] Hamburger menu cho sidebar (đang chưa có trong bản hiện tại — backlog UI.md mục "Chưa làm")
- [ ] Vaul drawer cho Contacts/Deals/Tasks detail panel (hiện chỉ Leads)
- [ ] Stat cards 1 col `<sm`, 2 col `sm-lg`, 4 col `lg+` (giữ nguyên)
- [ ] Kanban board: horizontal scroll snap, mỗi column `w-[80vw]`

---

## 7. Sample code — pattern khó

### 7.1 Sidebar với aurora glow drift

```tsx
// apps/web/src/components/layout/sidebar.tsx
export function Sidebar() {
  return (
    <aside className="aurora-glow w-56 bg-sidebar text-sidebar-fg flex flex-col h-screen sticky top-0">
      {/* logo */}
      <div className="flex items-center gap-2 p-4">
        <div className="w-9 h-9 rounded-xl bg-aurora grid place-items-center font-bold display text-white">A</div>
        <div>
          <div className="text-sm font-semibold display">Aurora CRM</div>
          <div className="text-[11px] text-sidebar-muted">{org.name}</div>
        </div>
      </div>
      {/* search trigger */}
      <button className="mx-3 mt-2 h-9 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-between px-3 text-sm transition">
        <span className="flex items-center gap-2"><Search className="w-4 h-4" /> Tìm kiếm…</span>
        <kbd className="text-[11px] bg-white/10 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
      </button>
      <nav className="mt-6 px-2 space-y-6 flex-1 overflow-y-auto sidebar-scroll">
        {sections.map(section => (
          <div key={section.title}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-muted px-3 mb-1">{section.title}</div>
            {section.items.map(item => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        ))}
      </nav>
      <UserCard />
    </aside>
  );
}

function NavLink({ item }: { item: NavItem }) {
  const active = usePathname() === item.href;
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition',
        active ? 'nav-item-active shimmer text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
      )}
    >
      <item.icon className="w-4 h-4" /> {item.label}
      {item.badge != null && (
        <span className={cn('ml-auto text-[10px] px-1.5 rounded', active ? 'bg-white/20' : 'bg-white/10')}>
          {item.badge}
        </span>
      )}
    </Link>
  );
}
```

### 7.2 KPI card with reveal + counter-up + sparkline

(Đã có ở 5.3. Sử dụng:)

```tsx
import { KpiCard } from '@/components/ui/kpi-card';
import { Users, TrendingUp, DollarSign, Target } from 'lucide-react';

<div className="grid grid-cols-4 gap-4">
  <KpiCard icon={Users}        label="Lead tiềm năng"  value={1284} format="comma"   delta={{ value: 12.4 }} color="aurora-violet" spark={[3,5,4,7,6,9,12]} delay={0}   />
  <KpiCard icon={TrendingUp}   label="Deal đang mở"    value={856}  format="comma"   delta={{ value: 8.1 }}  color="aurora-cyan"   spark={[5,4,6,7,8,7,10]} delay={120} />
  <KpiCard icon={DollarSign}   label="Doanh thu (tỷ)"  value={4.5}  format="decimal" delta={{ value: 23 }}   color="aurora-mint"   spark={[1,2,3,3,4,5,4]}  delay={190} />
  <KpiCard icon={Target}       label="Tỉ lệ chuyển đổi" value={68}  format="percent" delta={{ value: -2.1, positive: false }} color="aurora-rose" spark={[8,7,7,6,6,5,5]} delay={260} />
</div>
```

### 7.3 Funnel bars grow on reveal

```tsx
'use client';
import { useReveal } from '@/hooks/use-reveal';

const stages = [
  { label: 'Tiềm năng',     pct: 92, count: 12, value: '1.2 tỷ', from: 'aurora-violet', to: 'aurora-indigo' },
  { label: 'Đã liên hệ',    pct: 74, count:  8, value: '980 tr', from: 'aurora-indigo', to: 'aurora-cyan' },
  { label: 'Báo giá',       pct: 55, count:  5, value: '720 tr', from: 'aurora-cyan',   to: 'aurora-mint' },
  { label: 'Đàm phán',      pct: 34, count:  3, value: '480 tr', from: 'amber-400',     to: 'orange-500' },
  { label: 'Chốt hợp đồng', pct: 18, count:  2, value: '320 tr', from: 'emerald-400',   to: 'emerald-600' },
];

export function SalesFunnel() {
  const { ref, visible } = useReveal();
  return (
    <div ref={ref} className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-4">
          <div className="w-28 text-xs font-medium">{s.label}</div>
          <div className="flex-1 h-9 rounded-lg bg-muted overflow-hidden">
            <div
              className={`h-full rounded-lg bg-gradient-to-r from-${s.from} to-${s.to} flex items-center px-3 text-white text-xs font-semibold transition-[width] duration-[1400ms] ease-spring ${i === 4 ? 'shine' : ''}`}
              style={{ width: visible ? `${s.pct}%` : 0, transitionDelay: `${i * 100}ms` }}
            >
              {s.count} deal · {s.value}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 7.4 Deal card với assignees stack + due

```tsx
function DealCard({ deal }: { deal: Deal }) {
  const overdue = deal.dueAt && new Date(deal.dueAt) < new Date();
  const stageColor = stageColorMap[deal.stage]; // 'aurora-violet' | ...
  return (
    <div className="card deal-card cursor-pointer p-3.5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold line-clamp-2">{deal.name}</div>
        <span className="text-[10px] text-muted-foreground shrink-0">#D-{deal.id}</span>
      </div>
      <div className="display font-bold mt-2" style={{ color: `hsl(var(--${stageColor}))` }}>
        {formatCurrency(deal.amount)}
      </div>
      {deal.company && (
        <div className="mt-2 flex items-center gap-1.5">
          <AvatarGradient id={deal.company.id} name={deal.company.name} size="xs" />
          <span className="text-[11px] text-muted-foreground line-clamp-1">{deal.company.name}</span>
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <div className={cn('flex items-center gap-1 text-[11px]', overdue ? 'text-rose-600 font-medium' : 'text-muted-foreground')}>
          {overdue ? '⏰' : '📅'} {formatDate(deal.dueAt, 'DD/MM')}
        </div>
        <AvatarStack ids={deal.assignees} max={3} />
      </div>
    </div>
  );
}
```

### 7.5 Inbox — channel chip on avatar

```tsx
const channelMeta = {
  facebook:  { bg: 'bg-blue-500',    icon: '📘' },
  zalo:      { bg: 'bg-sky-500',     icon: '💙' },
  messenger: { bg: 'bg-violet-500',  icon: '💬' },
  email:     { bg: 'bg-emerald-500', icon: '📧' },
  sms:       { bg: 'bg-amber-500',   icon: '📱' },
} as const;

function ConvAvatar({ contact, channel }: { contact: Contact; channel: keyof typeof channelMeta }) {
  const m = channelMeta[channel];
  return (
    <div className="relative">
      <AvatarGradient id={contact.id} name={contact.name} size="md" />
      <span className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-card grid place-items-center text-[8px]', m.bg)}>
        {m.icon}
      </span>
    </div>
  );
}
```

### 7.6 Page transitions (optional, dùng Framer Motion KHÔNG cài)

Nếu muốn page transition mượt, dùng CSS view transitions API (Next.js 14 hỗ trợ qua `experimental.viewTransition` hoặc dùng `unstable_ViewTransition`). Giữ optional — không bắt buộc cho MVP redesign.

---

## 8. Phases triển khai

| Phase | Scope | DoD |
|---|---|---|
| **P0 — Foundation** | Mục 6.1 toàn bộ. Tạo trang `/_aurora-test` để xem tokens + 1 KPI card + 1 button + 1 status pill. | Render đúng, dark mode đúng, không vỡ trang nào hiện tại. |
| **P1 — Layout + Dashboard** | Mục 6.2, 6.3, 6.4. Đây là showcase chính. | Dashboard mới khớp mockup screen 02. Login khớp screen 01. Sidebar+header dùng ở mọi trang khác. |
| **P2 — List pages** | Mục 6.5, 6.6. Áp pattern Leads cho Contacts/Companies/Users/Audit. | Tất cả list pages có cùng toolbar/table/filter pattern. Status pill chuẩn hóa. |
| **P3 — Kanban pages** | Mục 6.7, 6.8. | Deals + Tasks kanban dùng `KanbanColumnHeader` + `deal-card`. Drag-drop vẫn chạy. |
| **P4 — Inbox + Marketing** | Mục 6.9, 6.10. | Inbox 3-cột với typing dots, channel chip. Marketing campaign card mới. |
| **P5 — Settings RBAC + Mobile** | Mục 6.11, 6.12. | RBAC matrix mới. Mobile drawer cho 3 entity còn lại + hamburger sidebar. |

**Estimate:** P0 ~0.5 ngày · P1 ~1 ngày · P2 ~1 ngày · P3 ~0.5 ngày · P4 ~1 ngày · P5 ~0.5 ngày = **~4.5 ngày dev**.

Mỗi phase 1 PR, mỗi item trong phase 1 commit nhỏ. Sau mỗi phase chạy `pnpm tsx scripts/capture-ui-screenshots.ts` để cập nhật `docs/ui/screenshots/`.

---

## 9. Acceptance criteria

Trước khi merge full redesign:

- [ ] Light mode + dark mode đều hoàn chỉnh ở mọi trang đã liệt kê
- [ ] `prefers-reduced-motion: reduce` tắt mọi animation (test bằng DevTools → Rendering → Emulate CSS media feature)
- [ ] Lighthouse Performance ≥ 90, Accessibility ≥ 95 cho `/dashboard` (sau redesign)
- [ ] Không có animation idle nào > 2 cái cùng viewport (đếm: sidebar drift + active nav shimmer = 2 OK; thêm bất kỳ idle thứ 3 = vi phạm)
- [ ] Counter-up + funnel grow chỉ chạy 1 lần khi vào view (IntersectionObserver disconnect sau đó)
- [ ] Build pass: `pnpm --filter web typecheck && pnpm --filter web build`
- [ ] Test pass: `pnpm --filter web test`
- [ ] Screenshots regenerated: `pnpm tsx scripts/capture-ui-screenshots.ts`
- [ ] `docs/UI.md` cập nhật để khớp design mới (hoặc thay bằng link tới file này)

---

## 10. Tham khảo

- Mockup tĩnh: [`docs/ui/redesign-preview/index.html`](./ui/redesign-preview/index.html) — mở trong browser để xem motion thật
- Bản UI cũ: [`docs/UI.md`](./UI.md)
- Design inspiration: Linear · Vercel Dashboard · Stripe · Cron · Notion 2026

---

_Spec viết sau khi user duyệt mockup ngày 2026-05-15. Phiên bản 1.0._
