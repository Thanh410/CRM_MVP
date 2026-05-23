'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = 'Chọn ngày', className, disabled }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const selected = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    const iso = date.toISOString().slice(0, 10);
    onChange(iso);
    setOpen(false);
  };

  const displayValue = selected
    ? selected.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-sm border border-zinc-200 rounded-lg',
            'bg-white hover:bg-zinc-50 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !displayValue && 'text-zinc-400',
            className,
          )}
        >
          <CalendarDays size={14} className="text-zinc-400 shrink-0" />
          <span className="flex-1 text-left">{displayValue ?? placeholder}</span>
          {value && (
            <span
              role="button"
              onClick={e => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 hover:text-zinc-900 text-zinc-400 rounded transition"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 bg-white rounded-xl border border-zinc-200 shadow-xl p-2 animate-in fade-in-0 zoom-in-95"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={viLocale}
            classNames={{
              root: 'rdp-custom',
              month_caption: 'text-sm font-semibold text-zinc-900 mb-1',
              nav: 'flex items-center gap-1',
              button_previous: 'p-1 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition',
              button_next: 'p-1 rounded-md hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition',
              week: 'flex gap-1',
              weekdays: 'flex gap-1 mb-1',
              weekday: 'w-8 text-center text-xs font-medium text-zinc-400',
              day: 'w-8 h-8 text-sm rounded-lg flex items-center justify-center hover:bg-zinc-100 cursor-pointer transition text-zinc-700',
              selected: '!bg-zinc-900 !text-white hover:!bg-zinc-800',
              today: 'text-indigo-600 font-semibold',
              outside: 'text-zinc-300',
              disabled: 'text-zinc-200 cursor-not-allowed',
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

const viLocale = {
  localize: {
    day: (n: number) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][n],
    month: (n: number) => [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
    ][n],
    ordinalNumber: (n: number) => `${n}`,
    era: () => 'AD',
    quarter: (n: number) => `Q${n}`,
    dayPeriod: (s: string) => s,
  },
  formatLong: {
    date: () => 'dd/MM/yyyy',
    time: () => 'HH:mm:ss',
    dateTime: () => 'dd/MM/yyyy HH:mm:ss',
  },
  formatRelative: () => '',
  match: {
    ordinalNumber: () => null,
    era: () => null,
    quarter: () => null,
    month: () => null,
    day: () => null,
    dayPeriod: () => null,
  },
  options: { weekStartsOn: 1 as const, firstWeekContainsDate: 4 },
} as any;
