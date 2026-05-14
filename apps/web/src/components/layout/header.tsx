'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X, Search } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, formatDate } from '@/lib/utils';
import { useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification } from '@/hooks/use-notifications';
import { useRouter } from 'next/navigation';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
    <header className="h-14 bg-white border-b border-zinc-200 flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && searchQuery.trim()) {
                router.push(`/leads?q=${encodeURIComponent(searchQuery.trim())}`);
                setSearchQuery('');
              }
            }}
            placeholder="Tìm kiếm... (Enter)"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400 transition"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="relative p-2 rounded-md text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            <Bell size={17} />
            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-3.5 bg-zinc-900 rounded-full flex items-center justify-center text-[9px] text-white font-bold px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-zinc-200 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-900">Thông báo</span>
                  {unread > 0 && (
                    <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-full font-medium">
                      {unread} mới
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    <CheckCheck size={12} />
                    Đánh dấu tất cả
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-zinc-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                    <Bell size={26} className="mb-2 opacity-30" />
                    <p className="text-sm">Không có thông báo</p>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead.mutate(n.id)}
                      className={`group px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-zinc-50 transition-colors ${!n.read ? 'bg-zinc-50/60' : ''}`}
                    >
                      <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? 'bg-zinc-900' : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-zinc-400 mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                            className="p-0.5 text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                          className="p-0.5 text-zinc-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
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
            <div className="w-7 h-7 bg-zinc-900 rounded-full flex items-center justify-center ring-2 ring-zinc-900/10">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-[11px] font-semibold text-white">
                  {getInitials(user.fullName)}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-zinc-800 leading-none">{user.fullName}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{user.roles?.[0]}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
