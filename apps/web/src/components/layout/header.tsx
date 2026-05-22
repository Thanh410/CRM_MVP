'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell, Check, CheckCheck, Search, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import {
  useDeleteNotification,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from '@/hooks/use-notifications';

export interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenMobileNav?: () => void;
}

export function Header({ onOpenSearch }: HeaderProps) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();
  const unread = notifications.filter((notification: { read: boolean }) => !notification.read).length;

  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:gap-4 sm:px-6">
      <div className="min-w-0 flex-1 sm:max-w-md">
        <button
          onClick={onOpenSearch}
          className="hidden w-full items-center gap-2 rounded-lg border border-border bg-muted py-1.5 pl-3 pr-2 text-sm text-muted-foreground transition hover:border-aurora-violet/40 hover:bg-aurora-violet/5 sm:flex"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Tìm kiếm...</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
        <button
          onClick={onOpenSearch}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground sm:hidden"
          aria-label="Tìm kiếm"
        >
          <Search size={18} />
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="relative rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted"
            aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ''}`}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="ping-ring absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-aurora-rose px-1 text-[9px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lift sm:w-80">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold">Thông báo</span>
                  {unread > 0 && (
                    <span className="rounded-full bg-aurora-violet/10 px-1.5 py-0.5 text-[10px] font-semibold text-aurora-violet">
                      {unread} mới
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <CheckCheck size={12} />
                    Đánh dấu tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 divide-y divide-border overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Bell size={26} className="mb-2 opacity-30" />
                    <p className="text-sm">Không có thông báo</p>
                  </div>
                ) : (
                  notifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      onClick={() => !notification.read && markRead.mutate(notification.id)}
                      className={`group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/60 ${
                        !notification.read ? 'bg-aurora-violet/5' : ''
                      }`}
                    >
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${!notification.read ? 'bg-aurora-violet' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{notification.title}</p>
                        {notification.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
                        <p className="mt-1 text-xs text-muted-foreground/70">{formatDate(notification.createdAt)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {!notification.read && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              markRead.mutate(notification.id);
                            }}
                            className="p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                          className="p-0.5 text-muted-foreground/50 opacity-100 transition-opacity hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
                          title="Xóa thông báo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2.5">
            <AvatarGradient id={user.id ?? user.email ?? user.fullName} name={user.fullName} size="sm" />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold leading-none text-foreground">{user.fullName}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{user.roles?.[0]}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
