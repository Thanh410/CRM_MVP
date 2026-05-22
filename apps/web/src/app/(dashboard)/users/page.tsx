'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { RippleButton } from '@/components/ui/ripple-button';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import {
  BulkActionBar,
  DataTablePagination,
  SelectableHeaderCheckbox,
  getDataTableQueryParams,
  parseDataTablePageSize,
  toggleVisibleSelection,
  type DataTablePageSize,
} from '@/components/ui/data-table-controls';

interface Role {
  id: string;
  name: string;
  displayName: string;
}
interface Dept {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  deptId: string | null;
}

interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  jobTitle?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  deptId?: string;
  teamId?: string;
  lastLoginAt?: string;
  dept?: Dept;
  team?: Team;
  userRoles: { role: Role }[];
}

const STATUS_TONES: Record<string, StatusTone> = {
  ACTIVE: 'emerald',
  INACTIVE: 'muted',
  INVITED: 'amber',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoáº¡t Ä‘á»™ng',
  INACTIVE: 'VÃ´ hiá»‡u',
  INVITED: 'ÄÃ£ má»i',
};

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  jobTitle: '',
  deptId: '',
  teamId: '',
  roleId: '',
  password: '',
};

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = !!user;
  const [form, setForm] = useState(() =>
    user
      ? {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone ?? '',
          jobTitle: user.jobTitle ?? '',
          deptId: user.deptId ?? '',
          teamId: user.teamId ?? '',
          roleId: user.userRoles?.[0]?.role?.id ?? '',
          password: '',
        }
      : EMPTY_FORM,
  );

  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/rbac/roles').then((res) => res.data),
  });
  const { data: depts = [] } = useQuery<Dept[]>({
    queryKey: ['depts'],
    queryFn: () => api.get('/organizations/departments').then((res) => res.data),
  });
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['teams'],
    queryFn: () => api.get('/organizations/teams').then((res) => res.data),
  });

  const filteredTeams = form.deptId ? teams.filter((team) => team.deptId === form.deptId) : teams;

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/users', payload).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Táº¡o ngÆ°á»i dÃ¹ng thÃ nh cÃ´ng');
      onClose();
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Táº¡o ngÆ°á»i dÃ¹ng tháº¥t báº¡i'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/users/${user!.id}`, payload).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Cáº­p nháº­t thÃ nh cÃ´ng');
      onClose();
    },
    onError: (error: any) => toast.error(error.response?.data?.message ?? 'Cáº­p nháº­t tháº¥t báº¡i'),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isEdit) {
      const { password, email, roleId, ...rest } = form;
      updateMutation.mutate(rest);
      return;
    }
    createMutation.mutate(form);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const inputCls =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm transition focus:border-aurora-violet focus:outline-none focus:ring-4 focus:ring-aurora-violet/15';
  const labelCls = 'mb-1 block text-xs font-medium text-muted-foreground';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-lift sm:max-w-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold text-foreground">
            {isEdit ? 'Chá»‰nh sá»­a ngÆ°á»i dÃ¹ng' : 'ThÃªm ngÆ°á»i dÃ¹ng má»›i'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Há» tÃªn *</label>
              <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Nguyá»…n VÄƒn A" required />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input
                className={inputCls}
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="email@company.com"
                required
                disabled={isEdit}
              />
            </div>
            <div>
              <label className={labelCls}>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
              <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="0901234567" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Chá»©c danh</label>
              <input className={inputCls} value={form.jobTitle} onChange={set('jobTitle')} placeholder="TrÆ°á»Ÿng phÃ²ng kinh doanh" />
            </div>
            <div>
              <label className={labelCls}>PhÃ²ng ban</label>
              <select
                className={inputCls}
                value={form.deptId}
                onChange={(event) => setForm((prev) => ({ ...prev, deptId: event.target.value, teamId: '' }))}
              >
                <option value="">Chá»n phÃ²ng ban</option>
                {depts.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>NhÃ³m</label>
              <select className={inputCls} value={form.teamId} onChange={set('teamId')}>
                <option value="">Chá»n nhÃ³m</option>
                {filteredTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            {!isEdit && (
              <div>
                <label className={labelCls}>Vai trÃ²</label>
                <select className={inputCls} value={form.roleId} onChange={set('roleId')}>
                  <option value="">Chá»n vai trÃ²</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.displayName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {!isEdit && (
              <div>
                <label className={labelCls}>Máº­t kháº©u *</label>
                <input className={inputCls} type="password" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            <RippleButton type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Há»§y
            </RippleButton>
            <RippleButton type="submit" variant="aurora" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? 'Äang lÆ°u...' : isEdit ? 'LÆ°u thay Ä‘á»•i' : 'Táº¡o ngÆ°á»i dÃ¹ng'}
            </RippleButton>
          </div>
        </form>
      </div>
    </div>
  );
}
function UserSlideOver({ userId, onClose, onEdit }: { userId: string; onClose: () => void; onEdit: (user: User) => void }) {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`).then((res) => res.data),
  });
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/rbac/roles').then((res) => res.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch(`/users/${userId}/deactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['user', userId] });
      toast.success('ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i');
    },
    onError: () => toast.error('Thao tÃ¡c tháº¥t báº¡i'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.post(`/rbac/users/${userId}/roles/${roleId}`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('ÄÃ£ gÃ¡n vai trÃ²');
    },
    onError: () => toast.error('GÃ¡n vai trÃ² tháº¥t báº¡i'),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/rbac/users/${userId}/roles/${roleId}`).then((res) => res.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('ÄÃ£ xÃ³a vai trÃ²');
    },
    onError: () => toast.error('XÃ³a vai trÃ² tháº¥t báº¡i'),
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-border bg-card text-card-foreground shadow-2xl sm:max-w-md">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 sm:px-5">
          <h3 className="font-display text-sm font-bold">Chi tiáº¿t ngÆ°á»i dÃ¹ng</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Äang táº£i...</div>
        ) : user ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-start gap-4 border-b border-border bg-aurora-soft/30 px-4 py-5 sm:px-5">
              {user.avatar ? (
                <img src={user.avatar} alt={user.fullName} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <AvatarGradient id={user.id ?? user.fullName} name={user.fullName} size="lg" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-foreground">{user.fullName}</p>
                {user.jobTitle && <p className="mt-0.5 text-sm text-muted-foreground">{user.jobTitle}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusPill tone={STATUS_TONES[user.status] ?? 'muted'}>{STATUS_LABELS[user.status]}</StatusPill>
                  {user.userRoles?.[0]?.role && <RoleBadge role={user.userRoles[0].role} />}
                </div>
              </div>
            </div>

            <InfoSection title="ThÃ´ng tin liÃªn há»‡">
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Äiá»‡n thoáº¡i" value={user.phone} />
            </InfoSection>

            <InfoSection title="Tá»• chá»©c">
              <InfoRow label="PhÃ²ng ban" value={user.dept?.name} />
              <InfoRow label="NhÃ³m" value={user.team?.name} />
            </InfoSection>

            {user.lastLoginAt && (
              <InfoSection title="Hoáº¡t Ä‘á»™ng">
                <InfoRow label="ÄÄƒng nháº­p cuá»‘i" value={formatDate(user.lastLoginAt)} />
              </InfoSection>
            )}

            <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vai trÃ²</p>
              <div className="flex flex-wrap gap-2">
                {user.userRoles?.map(({ role }) => (
                  <div key={role.id} className="flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-medium text-aurora-violet">
                    <Shield size={11} />
                    {role.displayName}
                    <button
                      onClick={() => removeRoleMutation.mutate(role.id)}
                      disabled={removeRoleMutation.isPending}
                      className="ml-0.5 rounded hover:text-red-500 disabled:opacity-60"
                      title="XÃ³a vai trÃ²"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {(!user.userRoles || user.userRoles.length === 0) && <p className="text-xs text-muted-foreground">ChÆ°a cÃ³ vai trÃ²</p>}
              </div>
              {allRoles.filter((role) => !user.userRoles?.some((userRole) => userRole.role.id === role.id)).length > 0 && (
                <select
                  value=""
                  onChange={(event) => {
                    if (event.target.value) assignRoleMutation.mutate(event.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-card px-2 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-aurora-violet/20"
                >
                  <option value="">+ ThÃªm vai trÃ²...</option>
                  {allRoles
                    .filter((role) => !user.userRoles?.some((userRole) => userRole.role.id === role.id))
                    .map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.displayName}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <button
                onClick={() => onEdit(user)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-aurora-violet/25 px-3 py-2 text-sm text-foreground hover:bg-aurora-soft/30"
              >
                <Pencil size={14} />
                Chá»‰nh sá»­a
              </button>
              <button
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm disabled:opacity-60 ${
                  user.status === 'ACTIVE'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}
              >
                {user.status === 'ACTIVE' ? (
                  <>
                    <UserX size={14} />
                    VÃ´ hiá»‡u hÃ³a
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    KÃ­ch hoáº¡t
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="w-28 shrink-0 pt-0.5 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words text-sm text-foreground">{value}</span>
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-aurora-violet/10 px-2 py-0.5 text-xs font-semibold text-aurora-violet">
      <Shield size={10} />
      {role.displayName}
    </span>
  );
}

function UserCard({ user, onOpen, onEdit, onDelete }: { user: User; onOpen: () => void; onEdit: () => void; onDelete: () => void }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3 shadow-soft">
      <button onClick={onOpen} className="flex w-full items-start gap-3 text-left">
        {user.avatar ? (
          <img src={user.avatar} alt={user.fullName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <AvatarGradient id={user.id ?? user.fullName} name={user.fullName} size="md" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{user.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <StatusPill tone={STATUS_TONES[user.status] ?? 'muted'}>{STATUS_LABELS[user.status]}</StatusPill>
          </div>
          {user.jobTitle && <p className="mt-2 line-clamp-1 text-sm text-muted-foreground">{user.jobTitle}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {user.userRoles?.[0]?.role && <RoleBadge role={user.userRoles[0].role} />}
            {user.dept?.name && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{user.dept.name}</span>}
          </div>
        </div>
      </button>
      <div className="mt-3 flex gap-2 border-t border-border pt-3">
        <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
          <Pencil size={13} />
          Sá»­a
        </button>
        <button onClick={onDelete} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
          <Trash2 size={13} />
          XÃ³a
        </button>
      </div>
    </article>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<DataTablePageSize>(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQ(search);
      setPage(1);
      setSelectedIds(new Set());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery<{ data: User[]; meta: any }>({
    queryKey: ['users', { search: q, page, pageSize }],
    queryFn: () => api.get('/users', { params: { search: q || undefined, ...getDataTableQueryParams(page, pageSize) } }).then((res) => res.data),
  });

  const users = data?.data ?? [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('ÄÃ£ xÃ³a ngÆ°á»i dÃ¹ng');
      if (slideOverId) setSlideOverId(null);
    },
    onError: () => toast.error('XÃ³a ngÆ°á»i dÃ¹ng tháº¥t báº¡i'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/users/bulk-delete', { ids }).then((res) => res.data as { deletedIds: string[]; failedIds: string[]; count: number }),
    onSuccess: ({ deletedIds, failedIds }) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      if (slideOverId && deletedIds.includes(slideOverId)) setSlideOverId(null);
      if (deletedIds.length > 0) toast.success(`ÄÃ£ xÃ³a ${deletedIds.length} ngÆ°á»i dÃ¹ng`);
      if (failedIds.length > 0) toast.error(`${failedIds.length} ngÆ°á»i dÃ¹ng chÆ°a xÃ³a Ä‘Æ°á»£c`);
    },
    onError: () => toast.error('XÃ³a ngÆ°á»i dÃ¹ng Ä‘Ã£ chá»n tháº¥t báº¡i'),
  });

  const handleDelete = (user: User) => {
    if (!window.confirm(`XÃ³a ngÆ°á»i dÃ¹ng "${user.fullName}"?`)) return;
    deleteMutation.mutate(user.id);
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const changePageSize = (value: string) => {
    const next = parseDataTablePageSize(value);
    if (next === 'all' && (meta?.total ?? 0) > 500 && !window.confirm(`Táº£i táº¥t cáº£ ${meta?.total ?? 0} ngÆ°á»i dÃ¹ng?`)) return;
    setPageSize(next);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`XÃ³a ${ids.length} ngÆ°á»i dÃ¹ng Ä‘Ã£ chá»n?`)) return;
    bulkDeleteMutation.mutate(ids);
  };

  const openCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setModalOpen(true);
    setSlideOverId(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">NgÆ°á»i dÃ¹ng</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{meta?.total ?? 0}</span> ngÆ°á»i dÃ¹ng trong há»‡ thá»‘ng
          </p>
        </div>
        <RippleButton variant="aurora" onClick={openCreate} className="w-full sm:w-auto">
          <Plus size={16} />
          ThÃªm ngÆ°á»i dÃ¹ng
        </RippleButton>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="TÃ¬m theo tÃªn, email..."
          className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm transition focus:border-aurora-violet focus:outline-none focus:ring-4 focus:ring-aurora-violet/15"
        />
      </div>

      <BulkActionBar
        count={selectedIds.size}
        entityLabel="ngÆ°á»i dÃ¹ng"
        onClear={() => setSelectedIds(new Set())}
        onDelete={handleBulkDelete}
      />

      <div className="grid gap-3 lg:hidden">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border border-border bg-card" />)
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            KhÃ´ng cÃ³ ngÆ°á»i dÃ¹ng nÃ o
          </div>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onOpen={() => setSlideOverId(user.id)}
              onEdit={() => openEdit(user)}
              onDelete={() => handleDelete(user)}
            />
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:block">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="w-10 px-4 py-3">
                <SelectableHeaderCheckbox
                  rows={users}
                  selectedIds={selectedIds}
                  onToggle={() => setSelectedIds((prev) => toggleVisibleSelection(users, prev))}
                />
              </th>
              <th className="w-[32%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">NgÆ°á»i dÃ¹ng</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vai trÃ²</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">PhÃ²ng ban</th>
              <th className="w-[18%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ÄÄƒng nháº­p cuá»‘i</th>
              <th className="w-[10%] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tráº¡ng thÃ¡i</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 7 }).map((_, colIndex) => (
                    <td key={colIndex} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  KhÃ´ng cÃ³ ngÆ°á»i dÃ¹ng nÃ o
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} onClick={() => setSlideOverId(user.id)} className="group cursor-pointer transition-colors hover:bg-aurora-soft/30">
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => toggleRow(user.id)}
                      className="h-4 w-4 rounded border-border accent-[hsl(var(--aurora-violet))]"
                      aria-label={`Chá»n ${user.fullName}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.fullName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <AvatarGradient id={user.id ?? user.fullName} name={user.fullName} size="sm" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{user.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{user.userRoles?.[0]?.role ? <RoleBadge role={user.userRoles[0].role} /> : <span className="text-xs text-muted-foreground">-</span>}</td>
                  <td className="truncate px-4 py-3 text-foreground/80">{user.dept?.name ?? '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '-'}</td>
                  <td className="px-4 py-3">
                    <StatusPill tone={STATUS_TONES[user.status] ?? 'muted'}>{STATUS_LABELS[user.status]}</StatusPill>
                  </td>
                  <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                    <UserRowMenu user={user} onEdit={() => openEdit(user)} onDelete={() => handleDelete(user)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && (
        <DataTablePagination
          page={pageSize === 'all' ? 1 : page}
          totalPages={meta.totalPages ?? 1}
          total={meta.total ?? 0}
          pageSize={pageSize}
          itemLabel="người dùng"
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
        />
      )}

      {modalOpen && <UserModal user={editingUser} onClose={() => setModalOpen(false)} />}
      {slideOverId && <UserSlideOver userId={slideOverId} onClose={() => setSlideOverId(null)} onEdit={openEdit} />}
    </div>
  );
}

function UserRowMenu({ user, onEdit, onDelete }: { user: User; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-lg p-1.5 text-muted-foreground opacity-100 transition hover:bg-muted hover:text-foreground lg:opacity-0 lg:group-hover:opacity-100"
        aria-label={`Thao tÃ¡c vá»›i ${user.fullName}`}
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <button onClick={() => { onEdit(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
            <Pencil size={13} />
            Chá»‰nh sá»­a
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} />
            XÃ³a
          </button>
        </div>
      )}
    </div>
  );
}
