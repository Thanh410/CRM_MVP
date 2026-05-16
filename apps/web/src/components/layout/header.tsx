'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Search, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { formatDate } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useDeleteNotification,
} from '@/hooks/use-notifications';

export interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenMobileNav?: () => void;
}

export function Header({ onOpenSearch, onOpenMobileNav }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const unread = notifications.filter((n: { read: boolean }) => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 bg-card border-b border-border flex items-center px-4 sm:px-6 gap-3 sm:gap-4 shrink-0">
      {/* Mobile hamburger */}
      <button
        onClick={onOpenMobileNav}
        className="md:hidden p-2 -ml-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition shrink-0"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      {/* Search — opens CommandPalette */}
      <div className="flex-1 max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 pl-3 pr-2 py-1.5 text-sm bg-muted border border-border rounded-lg hover:border-aurora-violet/40 hover:bg-aurora-violet/5 transition text-muted-foreground group"
        >
          <Search size={14} className="shrink-0" />
          <span className="flex-1 text-left">Tìm kiếm...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-card border border-border text-muted-foreground transition">
            <span className="text-[11px]">⌘</span>K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <ThemeToggle />

        {/* Notifications */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors"
            aria-label={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ''}`}
          >
            <Bell size={17} />
            {unread > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 bg-aurora-rose rounded-full flex items-center justify-center text-[9px] text-white font-bold px-1 ping-ring"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-popover text-popover-foreground rounded-xl shadow-lift border border-border z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold font-display">Thông báo</span>
                  {unread > 0 && (
                    <span className="text-[10px] bg-aurora-violet/10 text-aurora-violet px-1.5 py-0.5 rounded-full font-semibold">
                      {unread} mới
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <CheckCheck size={12} />
                    Đánh dấu tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Bell size={26} className="mb-2 opacity-30" />
                    <p className="text-sm">Không có thông báo</p>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead.mutate(n.id)}
                      className={`group px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-muted/60 transition-colors ${
                        !n.read ? 'bg-aurora-violet/5' : ''
                      }`}
                    >
                      <span
                        className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                          !n.read ? 'bg-aurora-violet' : 'bg-transparent'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-xs text-muted-foreground/70 mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markRead.mutate(n.id);
                            }}
                            className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(n.id);
                          }}
                          className="p-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 hover:text-rose-500 transition-opacity"
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

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2.5">
            <AvatarGradient
              id={user.id ?? user.email ?? user.fullName}
              name={user.fullName}
              size="sm"
            />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-foreground leading-none">{user.fullName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{user.roles?.[0]}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
