'use client';

import { ReactNode } from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsivePanelProps {
  /** Controlled open state — typically truthy if a row is selected */
  open: boolean;
  onClose: () => void;
  /** Title hiển thị trên header (mobile drawer + có thể dùng cho aria-label) */
  title?: string;
  children: ReactNode;
  /** Class thêm cho desktop panel */
  desktopClassName?: string;
}

/**
 * Hybrid layout component:
 * - Desktop (md+): hiển thị inline như side panel
 * - Mobile (< md): hiển thị qua vaul Drawer (slide-up từ dưới)
 *
 * Dùng cho leads/contacts/deals detail panel — tránh modal full-screen trên mobile.
 *
 * Usage:
 *   <ResponsivePanel open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
 *     <DetailContent item={selected} />
 *   </ResponsivePanel>
 */
export function ResponsivePanel({ open, onClose, title, children, desktopClassName }: ResponsivePanelProps) {
  if (!open) return null;

  return (
    <>
      {/* Desktop — inline panel */}
      <div className={cn('hidden md:block', desktopClassName)}>
        <div className="w-96 shrink-0 bg-white rounded-xl border border-zinc-200 overflow-hidden">
          {children}
        </div>
      </div>

      {/* Mobile — vaul drawer slide-up */}
      <Drawer.Root open={open} onOpenChange={(o) => !o && onClose()}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 md:hidden" />
          <Drawer.Content className="bg-white flex flex-col rounded-t-2xl h-[90vh] mt-24 fixed bottom-0 left-0 right-0 z-50 md:hidden">
            {/* Drag handle */}
            <div className="mx-auto mt-2 mb-1 h-1.5 w-12 rounded-full bg-zinc-300 shrink-0" />

            {title && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 shrink-0">
                <Drawer.Title className="text-sm font-semibold text-zinc-900 truncate">
                  {title}
                </Drawer.Title>
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
