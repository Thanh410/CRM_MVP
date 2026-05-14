'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Briefcase, CheckSquare,
  Megaphone, MessageSquare, Settings, LogOut,
  UserCircle, FolderOpen, UserCog, Shield, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

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
            ? 'bg-white/10 text-white'
            : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100',
        )}
      >
        <GroupIcon size={15} className={cn(hasActive ? 'text-white' : 'text-zinc-500')} />
        <span className="flex-1 text-left truncate">{group.label}</span>
        <ChevronRight
          size={12}
          className={cn(
            'shrink-0 transition-transform duration-200',
            open ? 'rotate-90' : '',
            hasActive ? 'text-white/50' : 'text-zinc-600',
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
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100',
                  )}
                >
                  <Icon size={13} className={cn(active ? 'text-white' : 'text-zinc-500')} />
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

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth, refreshToken } = useAuthStore();
  const router = useRouter();

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
    <aside className="w-56 bg-[#0f0f0f] flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-white/15 rounded-md flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">CRM Vietnam</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto sidebar-scroll space-y-0.5">
        {/* Dashboard — standalone */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
            isActive('/dashboard')
              ? 'bg-white/10 text-white'
              : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100',
          )}
        >
          <LayoutDashboard
            size={15}
            className={cn(isActive('/dashboard') ? 'text-white' : 'text-zinc-500')}
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
              ? 'bg-white/10 text-white'
              : 'text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100',
          )}
        >
          <Settings size={15} className={cn(isActive('/settings') ? 'text-white' : 'text-zinc-500')} />
          Cài đặt
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-white/[0.06] hover:text-red-400 transition-colors"
        >
          <LogOut size={15} className="text-zinc-500" />
          Đăng xuất
        </button>

        {user && (
          <div className="px-3 py-2.5 mt-2 bg-white/5 rounded-md">
            <p className="text-xs font-medium text-white truncate leading-tight">{user.fullName}</p>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
