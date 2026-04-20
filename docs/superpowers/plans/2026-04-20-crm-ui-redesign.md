# CRM UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng cấp sidebar với dropdown hover + collapse, thiết kế lại Settings page layout, bổ sung RBAC pipeline visualization.

**Architecture:** Three-phase approach: (1) Sidebar với collapsible state + SubNavDropdown component, (2) Settings vertical tabs layout, (3) RBAC PermissionBar pipeline component. Tất cả thay đổi chỉ ở frontend — không chạm backend.

**Tech Stack:** Next.js 14, Tailwind CSS, React Query, TypeScript

---

## File Map

```
apps/web/src/components/layout/
  sidebar.tsx                    MODIFY — thêm collapse state + dropdown integration
  sub-nav-dropdown.tsx          CREATE — dropdown component với hover behavior

apps/web/src/app/(dashboard)/settings/
  page.tsx                      MODIFY — vertical tab layout + RbacTab pipeline

apps/web/src/hooks/
  use-sidebar-collapse.ts        CREATE — hook để persist collapse state
```

---

## PR 1: Sidebar — Collapse + SubNavDropdown

### Task 1: Create `useSidebarCollapse` hook

**Files:**
- Create: `apps/web/src/hooks/use-sidebar-collapse.ts`

- [ ] **Step 1: Create hook file**

```typescript
// apps/web/src/hooks/use-sidebar-collapse.ts
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'sidebar-collapsed';

export function useSidebarCollapse() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggle = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return { isCollapsed, toggle };
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-sidebar-collapse.ts
git commit -m "feat: add useSidebarCollapse hook"
```

---

### Task 2: Create `SubNavDropdown` component

**Files:**
- Create: `apps/web/src/components/layout/sub-nav-dropdown.tsx`

- [ ] **Step 1: Create SubNavDropdown component**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface DropdownItem {
  label: string;
  href: string;
  isAction?: boolean; // styled as "+ Add" button
}

interface SubNavDropdownProps {
  label: string;
  icon: React.ReactNode;
  items: DropdownItem[];
  isCollapsed?: boolean;
  defaultHref: string;
}

export function SubNavDropdown({
  label,
  icon,
  items,
  isCollapsed = false,
  defaultHref,
}: SubNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [closeTimer, setCloseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLLIElement>(null);

  const openDropdown = () => {
    if (closeTimer) { clearTimeout(closeTimer); setCloseTimer(null); }
    const t = setTimeout(() => setOpen(true), 150);
    setHoverTimer(t);
  };

  const closeDropdown = () => {
    if (hoverTimer) { clearTimeout(hoverTimer); setHoverTimer(null); }
    const t = setTimeout(() => setOpen(false), 200);
    setCloseTimer(t);
  };

  const cancelClose = () => {
    if (closeTimer) { clearTimeout(closeTimer); setCloseTimer(null); }
  };

  useEffect(() => {
    return () => {
      if (hoverTimer) clearTimeout(hoverTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, [hoverTimer, closeTimer]);

  const hasSubItems = items.length > 0;

  if (isCollapsed) {
    // Collapsed: show icon only, dropdown appears to the right of sidebar
    return (
      <li
        ref={ref}
        className="relative"
        onMouseEnter={() => hasSubItems && openDropdown()}
        onMouseLeave={() => hasSubItems && closeDropdown()}
      >
        <Link
          href={defaultHref}
          className="flex items-center justify-center w-16 py-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          title={label}
        >
          {icon}
        </Link>
        {open && (
          <div
            className="absolute left-full top-0 ml-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
            onMouseEnter={cancelClose}
            onMouseLeave={closeDropdown}
          >
            <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
              {label}
            </p>
            {items.map((item) => (
              <DropdownLink key={item.href} item={item} />
            ))}
          </div>
        )}
      </li>
    );
  }

  return (
    <li
      ref={ref}
      className="relative"
      onMouseEnter={() => hasSubItems && openDropdown()}
      onMouseLeave={() => hasSubItems && closeDropdown()}
    >
      <Link
        href={defaultHref}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2.5">
          <span className="text-gray-400">{icon}</span>
          {label}
        </span>
        {hasSubItems && (
          <ChevronDown size={13} className={cn('text-gray-400 transition-transform', open && 'rotate-180')} />
        )}
      </Link>

      {open && hasSubItems && (
        <div
          className="absolute left-full top-0 ml-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1"
          onMouseEnter={cancelClose}
          onMouseLeave={closeDropdown}
        >
          {items.map((item) => (
            <DropdownLink key={item.href} item={item} />
          ))}
        </div>
      )}
    </li>
  );
}

function DropdownLink({ item }: { item: DropdownItem }) {
  if (item.isAction) {
    return (
      <button
        onClick={(e) => { e.preventDefault(); window.location.href = item.href; }}
        className="w-full text-left px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-1.5 transition-colors"
      >
        <span className="w-4 h-4 rounded border border-indigo-400 flex items-center justify-center">+</span>
        {item.label}
      </button>
    );
  }
  return (
    <Link
      href={item.href}
      className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
    >
      {item.label}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/sub-nav-dropdown.tsx
git commit -m "feat: add SubNavDropdown component"
```

---

### Task 3: Update `sidebar.tsx` — Collapse toggle + Dropdown integration

**Files:**
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Update imports**

Add to imports section (after existing imports):
```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSidebarCollapse } from '@/hooks/use-sidebar-collapse';
import { SubNavDropdown } from './sub-nav-dropdown';
```

- [ ] **Step 2: Define nav items WITH sub-items**

Replace `navItems` array with enriched version (after imports, before Sidebar component):

```typescript
// ─── Nav items with sub-items ──────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  subItems?: { label: string; href: string; isAction?: boolean }[];
}

const navItems: NavItem[] = [
  { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  {
    label: 'Khách hàng tiềm năng',
    href: '/leads',
    icon: UserCircle,
    subItems: [
      { label: 'Tất cả', href: '/leads' },
      { label: 'Tiềm năng (NEW)', href: '/leads?status=NEW' },
      { label: 'Đã liên hệ', href: '/leads?status=CONTACTED' },
      { label: 'Đủ điều kiện', href: '/leads?status=QUALIFIED' },
      { label: 'Không đủ điều kiện', href: '/leads?status=UNQUALIFIED' },
      { isAction: true, label: 'Thêm khách hàng mới', href: '/leads?new=1' },
    ],
  },
  {
    label: 'Liên hệ',
    href: '/contacts',
    icon: Users,
    subItems: [
      { label: 'Tất cả', href: '/contacts' },
      { isAction: true, label: 'Thêm liên hệ', href: '/contacts?new=1' },
    ],
  },
  {
    label: 'Công ty',
    href: '/companies',
    icon: Building2,
    subItems: [
      { label: 'Tất cả', href: '/companies' },
      { isAction: true, label: 'Thêm công ty', href: '/companies?new=1' },
    ],
  },
  {
    label: 'Cơ hội',
    href: '/deals',
    icon: Briefcase,
    subItems: [
      { label: 'Tất cả', href: '/deals' },
      { isAction: true, label: 'Thêm deal mới', href: '/deals?new=1' },
    ],
  },
  {
    label: 'Dự án',
    href: '/projects',
    icon: FolderOpen,
    subItems: [
      { label: 'Tất cả', href: '/projects' },
      { isAction: true, label: 'Thêm dự án', href: '/projects?new=1' },
    ],
  },
  {
    label: 'Nhiệm vụ',
    href: '/tasks',
    icon: CheckSquare,
    subItems: [
      { label: 'Tất cả', href: '/tasks' },
      { label: 'Cần làm', href: '/tasks?status=TODO' },
      { label: 'Đang làm', href: '/tasks?status=IN_PROGRESS' },
      { label: 'Đang xem xét', href: '/tasks?status=REVIEW' },
      { label: 'Hoàn thành', href: '/tasks?status=DONE' },
    ],
  },
  {
    label: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
    subItems: [
      { label: 'Tất cả', href: '/marketing' },
      { isAction: true, label: 'Tạo chiến dịch', href: '/marketing?new=1' },
    ],
  },
  { label: 'Hộp thư', href: '/inbox', icon: MessageSquare },
  { label: 'Nhân sự', href: '/users', icon: UserCog },
  { label: 'Nhật ký', href: '/audit', icon: Shield },
];
```

- [ ] **Step 3: Update Sidebar component body**

Replace `export function Sidebar() {` body:

```tsx
export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const { isCollapsed, toggle } = useSidebarCollapse();

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      await api.post('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
      router.push('/login');
    }
  };

  // Render a single nav item — either SubNavDropdown or plain Link
  const renderNavItem = (item: typeof navItems[number]) => {
    const Icon = item.icon;
    const active = pathname === item.href || pathname.startsWith(item.href + '/');

    if (item.subItems) {
      return (
        <SubNavDropdown
          key={item.href}
          label={item.label}
          icon={<Icon size={16} />}
          defaultHref={item.href}
          items={item.subItems}
          isCollapsed={isCollapsed}
        />
      );
    }

    // Plain nav item
    if (isCollapsed) {
      return (
        <li key={item.href}>
          <Link
            href={item.href}
            title={item.label}
            className={cn(
              'flex items-center justify-center w-16 py-2 transition-colors',
              active
                ? 'text-indigo-600'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50',
            )}
          >
            <Icon size={16} />
          </Link>
        </li>
      );
    }

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
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
        {/* Logo + toggle */}
        <div className="h-14 flex items-center justify-center border-b border-gray-100">
          <button
            onClick={toggle}
            title="Mở rộng sidebar"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5">
            {navItems.map(renderNavItem)}
          </ul>
        </nav>
        {/* Bottom */}
        <div className="py-3 border-t border-gray-100 flex flex-col items-center gap-0.5">
          <Link href="/settings" title="Cài đặt"
            className="flex items-center justify-center w-16 py-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition">
            <Settings size={16} />
          </Link>
          <button onClick={handleLogout} title="Đăng xuất"
            className="w-16 py-2 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
      {/* Logo + collapse toggle */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">CRM Vietnam</span>
        </div>
        <button
          onClick={toggle}
          title="Thu gọn sidebar"
          className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.map(renderNavItem)}
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
```

- [ ] **Step 4: Verify build**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: build succeeds, no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: sidebar collapse toggle + SubNavDropdown integration"
```

---

## PR 2: Settings Page — Vertical Tab Layout

### Task 4: Refactor Settings page to vertical tab layout

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx` (lines 628–682, the main page component)

- [ ] **Step 1: Add TabBar component + update page layout**

Replace the main page component (lines 638–682) with:

```tsx
// ─── Tab Bar ────────────────────────────────────────────────────────────────
function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; icon: React.ElementType }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="w-56 shrink-0 flex flex-col gap-1 pr-4 border-r border-gray-100">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-left transition-colors border-l-2',
              isActive
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-medium'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )}
          >
            <Icon size={15} className={isActive ? 'text-indigo-600' : 'text-gray-400'} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState('org');

  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Quản lý tổ chức, phân quyền và tích hợp
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-6 items-start">
        <TabBar tabs={TABS} active={tab} onChange={setTab} />

        {/* Content card */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6">
            {tab === 'org' && <OrgTab />}
            {tab === 'depts' && <DeptsTab />}
            {tab === 'teams' && <TeamsTab />}
            {tab === 'rbac' && <RbacTab />}
            {tab === 'tags' && <TagsTab />}
            {tab === 'integrations' && <IntegrationsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: build succeeds

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/settings/page.tsx
git commit -m "refactor(settings): vertical tab sidebar layout"
```

---

## PR 3: RBAC — Permission Pipeline Visualization

### Task 5: Create `PermissionBar` component

**Files:**
- Create: `apps/web/src/components/rbac/permission-bar.tsx`

- [ ] **Step 1: Create PermissionBar component**

```tsx
'use client';

import { cn } from '@/lib/utils';

interface PermissionBarProps {
  resource: string;
  action: string;
  isFull: boolean;     // full permission
  isScoped: boolean;   // own-data-only
  isOn: boolean;       // currently enabled
  onToggle: () => void;
  description?: string;
}

const RESOURCE_ACTION_LABELS: Record<string, string> = {
  'leads:create': 'Tạo lead mới',
  'leads:read': 'Xem danh sách lead',
  'leads:update': 'Cập nhật lead',
  'leads:delete': 'Xóa lead',
  'leads:assign': 'Gán lead cho người khác',
  'leads:export': 'Xuất danh sách lead',
  'contacts:create': 'Tạo liên hệ mới',
  'contacts:read': 'Xem liên hệ',
  'contacts:update': 'Cập nhật liên hệ',
  'contacts:delete': 'Xóa liên hệ',
  'contacts:export': 'Xuất danh sách liên hệ',
  'companies:create': 'Tạo công ty mới',
  'companies:read': 'Xem công ty',
  'companies:update': 'Cập nhật công ty',
  'companies:delete': 'Xóa công ty',
  'deals:create': 'Tạo deal mới',
  'deals:read': 'Xem deal',
  'deals:update': 'Cập nhật deal',
  'deals:delete': 'Xóa deal',
  'deals:assign': 'Gán deal cho người khác',
  'tasks:create': 'Tạo nhiệm vụ',
  'tasks:read': 'Xem nhiệm vụ',
  'tasks:update': 'Cập nhật nhiệm vụ',
  'tasks:delete': 'Xóa nhiệm vụ',
  'tasks:assign': 'Gán nhiệm vụ',
};

export function PermissionBar({
  resource,
  action,
  isOn,
  onToggle,
  description,
}: PermissionBarProps) {
  const key = `${resource}:${action}`;
  const label = RESOURCE_ACTION_LABELS[key] ?? `${resource} · ${action}`;
  const fullLabel = description ?? label;

  return (
    <button
      onClick={onToggle}
      title={fullLabel}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-left group',
        isOn
          ? 'bg-indigo-50/60 hover:bg-indigo-100'
          : 'hover:bg-gray-50',
      )}
    >
      {/* Label */}
      <div className="w-40 shrink-0">
        <p className={cn('text-sm', isOn ? 'text-indigo-800 font-medium' : 'text-gray-600')}>
          {action}
        </p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>

      {/* Bar */}
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            isOn ? 'bg-indigo-500' : 'bg-gray-200',
          )}
          style={{ width: isOn ? '100%' : '0%' }}
        />
      </div>

      {/* Badge */}
      <span
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
          isOn
            ? 'bg-indigo-600 text-white'
            : 'bg-gray-200 text-gray-400 group-hover:bg-gray-300',
        )}
      >
        {isOn ? '✓' : ''}
      </span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/rbac/permission-bar.tsx
git commit -m "feat: add PermissionBar component"
```

---

### Task 6: Update `RbacTab` — Pipeline layout

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx` (RbacTab function, lines 277–431)

- [ ] **Step 1: Update RbacTab with pipeline layout**

Replace the entire `RbacTab` function with:

```tsx
function RbacTab() {
  const qc = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [pendingPerms, setPendingPerms] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const { data: roles = [], isLoading: rolesLoading } = useQuery<RbacRole[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/rbac/roles').then(r => r.data),
  });

  const { data: allPermissions = [], isLoading: permsLoading } = useQuery<Permission[]>({
    queryKey: ['rbac-permissions'],
    queryFn: () => api.get('/rbac/permissions').then(r => r.data),
  });

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  const handleSelectRole = (role: RbacRole) => {
    setSelectedRoleId(role.id);
    const current = new Set((role.permissions ?? []).map(rp => rp.permission.id));
    setPendingPerms(current);
    setDirty(false);
  };

  const togglePerm = (permId: string) => {
    setPendingPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
    setDirty(true);
  };

  const updatePermsMutation = useMutation({
    mutationFn: (payload: { roleId: string; permissionIds: string[] }) =>
      api.put(`/rbac/roles/${payload.roleId}/permissions`, { permissionIds: payload.permissionIds }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      toast.success('Đã cập nhật quyền');
      setDirty(false);
    },
    onError: () => toast.error('Cập nhật quyền thất bại'),
  });

  const handleSave = () => {
    if (!selectedRoleId) return;
    updatePermsMutation.mutate({ roleId: selectedRoleId, permissionIds: Array.from(pendingPerms) });
  };

  // Import dynamically to avoid circular
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PermissionBar } = require('@/components/rbac/permission-bar');

  const permsByResource = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Role selector panel */}
      <div className="w-56 shrink-0 border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Vai trò</p>
        </div>
        {rolesLoading ? (
          <div className="p-4 text-sm text-gray-400">Đang tải...</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role)}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between',
                  selectedRoleId === role.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50',
                )}
              >
                <span>{role.displayName ?? role.name}</span>
                {selectedRoleId === role.id && (
                  <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Permission pipeline */}
      <div className="flex-1">
        {!selectedRole ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <ShieldCheck size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Chọn một vai trò để xem pipeline quyền</p>
          </div>
        ) : (
          <div>
            {/* Pipeline header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{selectedRole.displayName ?? selectedRole.name}</p>
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-medium">
                    {selectedRole.name}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {pendingPerms.size} / {allPermissions.length} quyền · Pipeline quyền của vai trò
                </p>
              </div>
              {dirty && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectRole(selectedRole)}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    ↺ Hoàn tác
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updatePermsMutation.isPending}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {updatePermsMutation.isPending ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                  </button>
                </div>
              )}
            </div>

            {/* Pipeline bars by resource */}
            {permsLoading ? (
              <div className="text-sm text-gray-400">Đang tải quyền...</div>
            ) : (
              <div className="space-y-5">
                {Object.entries(permsByResource).map(([resource, perms]) => (
                  <div key={resource} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Resource header */}
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        {resource}
                      </p>
                      <span className="ml-auto text-xs text-gray-400">
                        {perms.filter(p => pendingPerms.has(p.id)).length}/{perms.length} quyền
                      </span>
                    </div>
                    {/* Permission rows */}
                    <div className="divide-y divide-gray-50">
                      {perms.map(perm => (
                        <PermissionBar
                          key={perm.id}
                          resource={perm.resource}
                          action={perm.action}
                          isOn={pendingPerms.has(perm.id)}
                          isScoped={false}
                          onToggle={() => togglePerm(perm.id)}
                          description={perm.description}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add `cn` import if not present**

At top of settings/page.tsx, add:
```tsx
import { cn } from '@/lib/utils';
```

If `cn` is already imported (check imports), skip this step.

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npm run build 2>&1 | tail -20
```

Expected: build succeeds

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(settings): add RBAC permission pipeline visualization"
```

---

## Verification Checklist

- [ ] `cd apps/web && npm run build` — cả web không lỗi TypeScript
- [ ] Mở `http://localhost:3001/settings` → tab sidebar bên trái, content card bên phải
- [ ] Hover sidebar nav items → dropdown hiện sub-items
- [ ] Click collapse icon (logo bar) → sidebar thu gọn thành w-16
- [ ] Sidebar collapsed → icon vẫn hiện, tooltip label khi hover
- [ ] Settings → Phân quyền → click role → permission bars hiện với toggle
- [ ] Toggle permission bar → dirty state → Save button enabled
- [ ] `cd apps/api && npm run dev` — API không lỗi
