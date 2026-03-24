'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, Briefcase, CheckSquare,
  Megaphone, MessageSquare, BarChart2, Settings, LogOut,
  UserCircle, FolderOpen, UserCog, Shield,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

const navItems = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Khách hàng tiềm năng', href: '/leads', icon: UserCircle },
  { label: 'Liên hệ', href: '/contacts', icon: Users },
  { label: 'Công ty', href: '/companies', icon: Building2 },
  { label: 'Cơ hội', href: '/deals', icon: Briefcase },
  { label: 'Dự án', href: '/projects', icon: FolderOpen },
  { label: 'Nhiệm vụ', href: '/tasks', icon: CheckSquare },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Hộp thư', href: '/inbox', icon: MessageSquare },
  { label: 'Nhân sự', href: '/users', icon: UserCog },
  { label: 'Nhật ký', href: '/audit', icon: Shield },
];

const bottomItems = [
  { label: 'Cài đặt', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center px-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">CRM Vietnam</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <Icon size={16} className={active ? 'text-indigo-600' : 'text-gray-400'} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-gray-100 space-y-0.5">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Icon size={16} className="text-gray-400" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} className="text-gray-400" />
          Đăng xuất
        </button>

        {/* User info */}
        {user && (
          <div className="px-3 py-2 mt-2 bg-gray-50 rounded-lg">
            <p className="text-xs font-medium text-gray-700 truncate">{user.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
