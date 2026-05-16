'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Briefcase, CheckSquare,
  Megaphone, MessageSquare, Settings, LogOut,
  UserCircle, FolderOpen, UserCog, Shield, ChevronRight, X,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { AvatarGradient } from '@/components/ui/avatar-gradient';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroupDef {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const NAV_GROUPS: NavGroupDef[] = [
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

function NavGroup({ group, pathname }: { group: NavGroupDef; pathname: string }) {
  const hasActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/'),
  );
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

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {/* Group header */}
      <button
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
          hasActive
            ? 'nav-item-active text-white'
            : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
        )}
      >
        <GroupIcon size={15} className={cn(hasActive ? 'text-white' : 'text-white/40')} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronRight
          size={12}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'rotate-90' : '',
            hasActive ? 'text-white/50' : 'text-white/30',
          )}
        />
      </button>

      {/* Sub-items with smooth expand */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-out',
          open ? 'max-h-52 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <ul className="mt-0.5 ml-3.5 border-l border-white/[0.08] pl-2.5 space-y-0.5 pb-1">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    active
                      ? 'nav-item-active shimmer text-white font-medium'
                      : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
                  )}
                >
                  <Icon size={13} className={cn(active ? 'text-white' : 'text-white/40')} />
                  <span className="truncate">{item.label}</span>
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
  /** Mobile drawer open state. Ignored on desktop (md+). */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

  // Auto-close mobile drawer khi navigate
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'aurora-glow w-56 bg-sidebar text-sidebar-fg flex flex-col h-full shrink-0',
          // Mobile: fixed slide-in drawer
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-spring',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static
          'md:relative md:translate-x-0 md:transition-none',
        )}
      >
      {/* Logo + mobile close */}
      <div className="h-14 flex items-center px-4 shrink-0 justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-aurora rounded-xl flex items-center justify-center shadow-pop">
            <span className="text-white font-bold text-sm font-display">A</span>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight font-display">Aurora CRM</span>
        </div>
        <button
          onClick={onMobileClose}
          className="md:hidden p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-md transition"
          aria-label="Đóng menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto sidebar-scroll space-y-0.5">
        {/* Dashboard — standalone */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            isActive('/dashboard')
              ? 'nav-item-active shimmer text-white'
              : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
          )}
        >
          <LayoutDashboard
            size={15}
            className={cn(isActive('/dashboard') ? 'text-white' : 'text-white/40')}
          />
          <span className="truncate">Tổng quan</span>
        </Link>

        {/* Dropdown groups */}
        {NAV_GROUPS.map((group) => (
          <NavGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/[0.08] space-y-0.5 shrink-0">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            isActive('/settings')
              ? 'nav-item-active shimmer text-white'
              : 'text-sidebar-muted hover:bg-white/[0.06] hover:text-white',
          )}
        >
          <Settings size={15} className={cn(isActive('/settings') ? 'text-white' : 'text-white/40')} />
          Cài đặt
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-sidebar-muted hover:bg-white/[0.06] hover:text-rose-400 transition-colors"
        >
          <LogOut size={15} className="text-white/40" />
          Đăng xuất
        </button>

        {user && (
          <div className="px-3 py-2.5 mt-2 bg-white/5 rounded-xl border border-white/10 flex items-center gap-2.5">
            <AvatarGradient
              id={user.id ?? user.email ?? user.fullName}
              name={user.fullName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-white truncate leading-tight">{user.fullName}</p>
              <p className="text-[11px] text-sidebar-muted truncate mt-0.5">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}
