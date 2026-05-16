'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Briefcase, CheckSquare, MoreHorizontal, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';

const PRIMARY_TABS = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Deals', href: '/deals', icon: Briefcase },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
];

interface BottomNavProps {
  onOpenMore: () => void;
}

export function BottomNav({ onOpenMore }: BottomNavProps) {
  const pathname = usePathname();
  const { data: notifications = [] } = useNotifications();
  const unread = notifications.filter((n: { read: boolean }) => !n.read).length;

  const isMoreActive = [
    '/contacts', '/companies', '/projects', '/marketing',
    '/inbox', '/users', '/audit', '/settings',
  ].some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-card/95 backdrop-blur-xl border-t border-border flex items-end pb-2 px-1 safe-area-bottom">
      {PRIMARY_TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 rounded-xl transition-colors min-h-[52px]',
              active ? 'text-aurora-violet' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <div
              className={cn(
                'px-3 py-1 rounded-xl transition-all duration-200',
                active && 'bg-aurora-violet/15',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span className={cn('text-[10px] font-medium transition-colors', active && 'text-aurora-violet')}>
              {label}
            </span>
          </Link>
        );
      })}

      {/* More tab */}
      <button
        onClick={onOpenMore}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 rounded-xl transition-colors min-h-[52px] relative',
          isMoreActive ? 'text-aurora-violet' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <div
          className={cn(
            'px-3 py-1 rounded-xl transition-all duration-200 relative',
            isMoreActive && 'bg-aurora-violet/15',
          )}
        >
          <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 2} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-aurora-rose rounded-full flex items-center justify-center text-[8px] text-white font-bold border border-card">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span className={cn('text-[10px] font-medium', isMoreActive && 'text-aurora-violet')}>
          Thêm
        </span>
      </button>
    </nav>
  );
}
