'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Briefcase,
  Building2,
  CheckSquare,
  Clock,
  FolderOpen,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

type SearchScope = 'all' | 'crm' | 'work' | 'connect' | 'manage';
type SearchResultType =
  | 'lead'
  | 'contact'
  | 'company'
  | 'deal'
  | 'project'
  | 'task'
  | 'user'
  | 'audit'
  | 'chat'
  | 'inbox'
  | 'setting';

interface SearchItem {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
  status?: string;
  updatedAt?: string;
}

interface SearchGroup {
  key: string;
  label: string;
  items: SearchItem[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const SCOPES: Array<{ key: SearchScope; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'crm', label: 'CRM' },
  { key: 'work', label: 'Công việc' },
  { key: 'connect', label: 'Kết nối' },
  { key: 'manage', label: 'Quản lý' },
];

const TYPE_ICONS: Record<SearchResultType, any> = {
  lead: Users,
  contact: Users,
  company: Building2,
  deal: Briefcase,
  project: FolderOpen,
  task: CheckSquare,
  user: UserCog,
  audit: Shield,
  chat: MessageSquare,
  inbox: MessageSquare,
  setting: Settings,
};

const QUICK_ACTIONS: SearchItem[] = [
  { id: 'quick-create-lead', type: 'lead', title: 'Tạo lead', subtitle: 'Mở màn khách hàng tiềm năng', href: '/leads?action=create' },
  { id: 'quick-create-project', type: 'project', title: 'Tạo dự án', subtitle: 'Mở màn dự án', href: '/projects?action=create' },
  { id: 'quick-create-task', type: 'task', title: 'Tạo nhiệm vụ', subtitle: 'Mở màn nhiệm vụ', href: '/tasks?action=create' },
  { id: 'quick-settings', type: 'setting', title: 'Mở cài đặt', subtitle: 'Tổ chức, phân quyền, tích hợp', href: '/settings' },
];

function getRecentKey(userId?: string) {
  return `aurora:recent-search:${userId ?? 'anonymous'}`;
}

function useGlobalSearch(q: string, scope: SearchScope, enabled: boolean) {
  return useQuery<{ groups: SearchGroup[] }>({
    queryKey: ['global-search', { q, scope }],
    queryFn: () => api.get('/search', { params: { q: q || undefined, scope, limit: 5 } }).then((res) => res.data),
    enabled,
    staleTime: 10_000,
  });
}

function SearchScopeTabs({ scope, onChange }: { scope: SearchScope; onChange: (scope: SearchScope) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2">
      {SCOPES.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
            scope === item.key ? 'bg-aurora-violet text-white' : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SearchResultGroup({ group, onSelect }: { group: SearchGroup; onSelect: (item: SearchItem) => void }) {
  if (group.items.length === 0) return null;

  return (
    <Command.Group heading={group.label}>
      {group.items.map((item) => (
        <SearchResultItem key={`${item.type}-${item.id}`} item={item} onSelect={onSelect} />
      ))}
    </Command.Group>
  );
}

function SearchResultItem({ item, onSelect }: { item: SearchItem; onSelect: (item: SearchItem) => void }) {
  const Icon = TYPE_ICONS[item.type] ?? Search;

  return (
    <Command.Item
      value={`${item.type}-${item.id}-${item.title}-${item.subtitle ?? ''}`}
      onSelect={() => onSelect(item)}
      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted data-[selected]:bg-muted"
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-aurora-violet/10 text-aurora-violet">
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{item.title}</p>
        {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
      </div>
      {item.status && (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {item.status}
        </span>
      )}
    </Command.Item>
  );
}

function SearchQuickActions({ onSelect }: { onSelect: (item: SearchItem) => void }) {
  return <SearchResultGroup group={{ key: 'quick', label: 'Hành động nhanh', items: QUICK_ACTIONS }} onSelect={onSelect} />;
}

function RecentSearches({ items, onSelect }: { items: SearchItem[]; onSelect: (item: SearchItem) => void }) {
  if (items.length === 0) return null;

  return (
    <Command.Group heading="Gần đây">
      {items.slice(0, 5).map((item) => (
        <Command.Item
          key={`recent-${item.type}-${item.id}`}
          value={`recent-${item.type}-${item.id}-${item.title}`}
          onSelect={() => onSelect(item)}
          className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted data-[selected]:bg-muted"
        >
          <Clock size={15} className="shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{item.title}</p>
            {item.subtitle && <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>}
          </div>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('all');
  const [recentItems, setRecentItems] = useState<SearchItem[]>([]);
  const recentKey = useMemo(() => getRecentKey(user?.id), [user?.id]);
  const searchQuery = useGlobalSearch(query.trim(), scope, open);
  const groups = searchQuery.data?.groups ?? [];

  useEffect(() => {
    if (!open) {
      setQuery('');
      setScope('all');
      return;
    }

    try {
      const raw = window.localStorage.getItem(recentKey);
      setRecentItems(raw ? JSON.parse(raw) : []);
    } catch {
      setRecentItems([]);
    }
  }, [open, recentKey]);

  const remember = useCallback((item: SearchItem) => {
    const next = [item, ...recentItems.filter((recent) => !(recent.type === item.type && recent.id === item.id))].slice(0, 10);
    setRecentItems(next);
    try {
      window.localStorage.setItem(recentKey, JSON.stringify(next));
    } catch {
      // localStorage can be unavailable in private contexts.
    }
  }, [recentItems, recentKey]);

  const navigate = useCallback((item: SearchItem) => {
    remember(item);
    router.push(item.href);
    onClose();
  }, [onClose, remember, router]);

  if (!open) return null;

  const showDiscovery = query.trim().length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[10vh] sm:pt-[15vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
        <Command className="flex flex-col" shouldFilter={false}>
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm kiếm toàn hệ thống..."
              autoFocus
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground transition hover:text-foreground">
              <X size={14} />
            </button>
          </div>

          <SearchScopeTabs scope={scope} onChange={setScope} />

          <Command.List className="max-h-[60dvh] overflow-y-auto py-2">
            {showDiscovery ? (
              <>
                <SearchQuickActions onSelect={navigate} />
                <RecentSearches items={recentItems} onSelect={navigate} />
                {groups.map((group) => (
                  <SearchResultGroup key={group.key} group={group} onSelect={navigate} />
                ))}
              </>
            ) : searchQuery.isLoading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">Đang tìm kiếm...</div>
            ) : groups.length === 0 ? (
              <Command.Empty className="py-10 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả phù hợp
              </Command.Empty>
            ) : (
              groups.map((group) => <SearchResultGroup key={group.key} group={group} onSelect={navigate} />)
            )}
          </Command.List>

          <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span><kbd className="rounded border border-border bg-muted px-1">↑↓</kbd> điều hướng</span>
            <span><kbd className="rounded border border-border bg-muted px-1">Enter</kbd> chọn</span>
            <span><kbd className="rounded border border-border bg-muted px-1">Esc</kbd> đóng</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
