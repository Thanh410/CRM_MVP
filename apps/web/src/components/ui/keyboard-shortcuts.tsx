'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

interface Shortcut {
  keys: string[];
  label: string;
  group: 'Điều hướng' | 'Hành động' | 'Hệ thống';
  action: (router: ReturnType<typeof useRouter>) => void;
}

/**
 * Danh sách shortcuts toàn cục.
 * Pattern: single key (g, c, /) hoặc sequence (g+d).
 */
const SHORTCUTS: Shortcut[] = [
  // Điều hướng (prefix g)
  { keys: ['g', 'd'], label: 'Đi tới Tổng quan', group: 'Điều hướng', action: (r) => r.push('/dashboard') },
  { keys: ['g', 'l'], label: 'Đi tới Khách hàng tiềm năng', group: 'Điều hướng', action: (r) => r.push('/leads') },
  { keys: ['g', 'c'], label: 'Đi tới Liên hệ', group: 'Điều hướng', action: (r) => r.push('/contacts') },
  { keys: ['g', 'o'], label: 'Đi tới Công ty', group: 'Điều hướng', action: (r) => r.push('/companies') },
  { keys: ['g', 'e'], label: 'Đi tới Cơ hội', group: 'Điều hướng', action: (r) => r.push('/deals') },
  { keys: ['g', 't'], label: 'Đi tới Nhiệm vụ', group: 'Điều hướng', action: (r) => r.push('/tasks') },
  { keys: ['g', 'i'], label: 'Đi tới Hộp thư', group: 'Điều hướng', action: (r) => r.push('/inbox') },
  { keys: ['g', 's'], label: 'Đi tới Cài đặt', group: 'Điều hướng', action: (r) => r.push('/settings') },

  // Hành động
  { keys: ['c'], label: 'Tạo mới (theo trang)', group: 'Hành động', action: () => triggerCreate() },
  { keys: ['/'], label: 'Focus thanh tìm kiếm', group: 'Hành động', action: () => focusSearch() },
  { keys: ['⌘', 'k'], label: 'Mở Command Palette', group: 'Hành động', action: () => openCommandPalette() },

  // Hệ thống
  { keys: ['?'], label: 'Hiện danh sách phím tắt', group: 'Hệ thống', action: () => {} }, // handled below
  { keys: ['Esc'], label: 'Đóng modal/drawer', group: 'Hệ thống', action: () => {} },
];

function triggerCreate() {
  // Trigger CTA primary trên trang hiện tại bằng custom event
  document.dispatchEvent(new CustomEvent('crm:create-shortcut'));
}

function focusSearch() {
  const el = document.querySelector<HTMLInputElement>('input[type="search"], input[placeholder*="ìm"]');
  el?.focus();
  el?.select();
}

function openCommandPalette() {
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: true, bubbles: true }));
}

export function KeyboardShortcutsProvider() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [keyBuffer, setKeyBuffer] = useState<string>('');

  const handleKey = useCallback((e: KeyboardEvent) => {
    // Bỏ qua khi đang gõ trong input/textarea
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    // Mở help modal: ?
    if (e.key === '?' && !isInput) {
      e.preventDefault();
      setOpen(o => !o);
      return;
    }

    // ESC đóng modal
    if (e.key === 'Escape') {
      setOpen(false);
      setKeyBuffer('');
      return;
    }

    if (isInput) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return; // skip with modifiers (Cmd+K được handle riêng)

    // Single key shortcuts
    if (e.key === '/') {
      e.preventDefault();
      focusSearch();
      return;
    }
    if (e.key === 'c') {
      e.preventDefault();
      triggerCreate();
      return;
    }

    // Sequence g+x
    const newBuffer = (keyBuffer + e.key).slice(-2);
    setKeyBuffer(newBuffer);

    const matched = SHORTCUTS.find(s => s.keys.length === 2 && s.keys[0] === newBuffer[0] && s.keys[1] === newBuffer[1]);
    if (matched) {
      e.preventDefault();
      matched.action(router);
      setKeyBuffer('');
    }

    // Clear buffer sau 1.5s không gõ
    setTimeout(() => setKeyBuffer(''), 1500);
  }, [keyBuffer, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey, isAuthenticated]);

  if (!open) return null;

  const grouped = SHORTCUTS.reduce<Record<string, Shortcut[]>>((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push(s);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-zinc-500" />
            <h2 className="text-base font-semibold text-zinc-900">Phím tắt</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(grouped).map(([group, shortcuts]) => (
            <div key={group} className="mb-5 last:mb-0">
              <h3 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">{group}</h3>
              <div className="space-y-1.5">
                {shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-700">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, ki) => (
                        <span key={ki} className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-zinc-50/50 border-t border-zinc-100 text-[11px] text-zinc-400">
          Mẹo: gõ <kbd className="px-1 bg-white border border-zinc-200 rounded">?</kbd> bất cứ lúc nào để mở danh sách này
        </div>
      </div>
    </div>
  );
}
