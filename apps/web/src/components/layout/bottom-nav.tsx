'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Briefcase, CheckSquare, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react';
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
  const unread = notifications.filter((notification: { read: boolean }) => !notification.read).length;

  const isMoreActive = [
    '/contacts',
    '/companies',
    '/projects',
    '/marketing',
    '/inbox',
    '/chat',
    '/users',
    '/audit',
    '/settings',
  ].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 flex h-16 items-end border-t border-border bg-card/95 px-1 pb-2 backdrop-blur-xl lg:hidden">
      {PRIMARY_TABS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl pb-1 pt-1.5 transition-colors',
              active ? 'text-aurora-violet' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <div className={cn('rounded-xl px-3 py-1 transition-all duration-200', active && 'bg-aurora-violet/15')}>
              <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            </div>
            <span className={cn('text-[10px] font-medium transition-colors', active && 'text-aurora-violet')}>{label}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMore}
        className={cn(
          'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl pb-1 pt-1.5 transition-colors',
          isMoreActive ? 'text-aurora-violet' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <div className={cn('relative rounded-xl px-3 py-1 transition-all duration-200', isMoreActive && 'bg-aurora-violet/15')}>
          <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.5 : 2} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-card bg-aurora-rose text-[8px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        <span className={cn('text-[10px] font-medium', isMoreActive && 'text-aurora-violet')}>Thêm</span>
      </button>
    </nav>
  );
}
