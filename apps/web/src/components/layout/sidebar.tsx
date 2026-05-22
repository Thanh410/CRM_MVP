'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Briefcase,
  Building2,
  CheckSquare,
  ChevronRight,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Settings,
  Shield,
  UserCircle,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { useChatUnreadCount } from '@/app/(dashboard)/chat/hooks';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  label: string;
  href: string;
  icon: ElementType;
  badge?: number;
}

interface NavGroupDef {
  label: string;
  icon: ElementType;
  items: NavItem[];
}

function buildNavGroups(chatUnreadCount: number): NavGroupDef[] {
  return [
    {
      label: 'CRM',
      icon: UserCircle,
      items: [
        { label: 'Khách hàng tiềm năng', href: '/leads', icon: UserCircle },
        { label: 'Liên hệ', href: '/contacts', icon: Users },
        { label: 'Công ty', href: '/companies', icon: Building2 },
        { label: 'Cơ hội', href: '/deals', icon: Briefcase },
      ],
    },
    {
      label: 'Công việc',
      icon: CheckSquare,
      items: [
        { label: 'Dự án', href: '/projects', icon: FolderOpen },
        { label: 'Nhiệm vụ', href: '/tasks', icon: CheckSquare },
      ],
    },
    {
      label: 'Kết nối',
      icon: Megaphone,
      items: [
        { label: 'Marketing', href: '/marketing', icon: Megaphone },
        { label: 'Hộp thư', href: '/inbox', icon: MessageSquare },
        { label: 'Chat', href: '/chat', icon: MessageSquare, badge: chatUnreadCount },
      ],
    },
    {
      label: 'Quản lý',
      icon: Shield,
      items: [
        { label: 'Nhân sự', href: '/users', icon: UserCog },
        { label: 'Nhật ký', href: '/audit', icon: Shield },
      ],
    },
  ];
}

function NavBadge({ count }: { count?: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-aurora-violet px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? '99+' : count}
    </span>
  );
}

function NavGroup({ group, pathname }: { group: NavGroupDef; pathname: string }) {
  const hasActive = group.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const [hovered, setHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const GroupIcon = group.icon;
  const open = hovered || hasActive;

  const onEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setHovered(true);
  };

  const onLeave = () => {
    timerRef.current = setTimeout(() => setHovered(false), 120);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      <button
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          hasActive ? 'nav-item-active text-white' : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
        )}
      >
        <GroupIcon size={15} className={cn(hasActive ? 'text-white' : 'text-white/40')} />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronRight
          size={12}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'rotate-90' : '',
            hasActive ? 'text-white/50' : 'text-white/30',
          )}
        />
      </button>

      <div className={cn('overflow-hidden transition-all duration-200 ease-out', open ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0')}>
        <ul className="ml-3.5 mt-0.5 space-y-0.5 border-l border-white/[0.08] pb-1 pl-2.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors',
                    active ? 'nav-item-active shimmer font-medium text-white' : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <Icon size={13} className={cn(active ? 'text-white' : 'text-white/40')} />
                  <span className="truncate">{item.label}</span>
                  <NavBadge count={item.badge} />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();
  const { data: chatUnread } = useChatUnreadCount();
  const navGroups = useMemo(() => buildNavGroups(chatUnread?.count ?? 0), [chatUnread?.count]);

  useEffect(() => {
    if (mobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          ' flex h-full w-64 max-w-[85vw] shrink-0 flex-col bg-sidebar text-sidebar-fg lg:w-56',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-spring',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:relative lg:inset-auto lg:translate-x-0 lg:transition-none',
        )}
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-aurora shadow-pop">
              <span className="font-display text-sm font-bold text-white">A</span>
            </div>
            <span className="font-display text-sm font-semibold tracking-tight text-white">Aurora CRM</span>
          </div>
          <button
            onClick={onMobileClose}
            className="rounded-md p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          <Link
            href="/dashboard"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive('/dashboard') ? 'nav-item-active shimmer text-white' : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
            )}
          >
            <LayoutDashboard size={15} className={cn(isActive('/dashboard') ? 'text-white' : 'text-white/40')} />
            <span className="truncate">Tổng quan</span>
          </Link>

          {navGroups.map((group) => (
            <NavGroup key={group.label} group={group} pathname={pathname} />
          ))}
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-white/[0.08] px-3 py-3">
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive('/settings') ? 'nav-item-active shimmer text-white' : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
            )}
          >
            <Settings size={15} className={cn(isActive('/settings') ? 'text-white' : 'text-white/40')} />
            Cài đặt
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-white/[0.06] hover:text-rose-400"
          >
            <LogOut size={15} className="text-white/40" />
            Đăng xuất
          </button>

          {user && (
            <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <AvatarGradient id={user.id ?? user.email ?? user.fullName} name={user.fullName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium leading-tight text-white">{user.fullName}</p>
                <p className="mt-0.5 truncate text-[11px] text-sidebar-muted">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
