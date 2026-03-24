'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials, formatDate } from '@/lib/utils';
import { useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification } from '@/hooks/use-notifications';
import { Search } from 'lucide-react';

export function Header() {
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const deleteNotification = useDeleteNotification();

  const unread = notifications.filter((n: any) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications Bell */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="relative p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold px-0.5">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Thông báo</span>
                  {unread > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-medium">
                      {unread} mới
                    </span>
                  )}
                </div>
                {unread > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    <CheckCheck size={12} />
                    Đánh dấu tất cả đã đọc
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                    <Bell size={28} className="mb-2 opacity-30" />
                    <p className="text-sm">Không có thông báo</p>
                  </div>
                ) : (
                  notifications.map((n: any) => (
                    <div
                      key={n.id}
                      onClick={() => !n.read && markRead.mutate(n.id)}
                      className={`group px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? 'bg-indigo-50/40' : ''}`}
                    >
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 bg-indigo-500 rounded-full shrink-0" />
                      )}
                      {n.read && <span className="mt-1.5 w-2 h-2 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}
                            className="p-0.5 text-gray-400 hover:text-indigo-600"
                            title="Đánh dấu đã đọc"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification.mutate(n.id); }}
                          className="p-0.5 text-gray-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                          title="Xóa thông báo"
                        >
                          <X size={13} />
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
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-indigo-700">
                  {getInitials(user.fullName)}
                </span>
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-gray-700 leading-none">{user.fullName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user.roles[0]}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
