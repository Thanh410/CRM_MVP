'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, MoreHorizontal, Pencil, Trash2, UserX, UserCheck, Shield, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Role { id: string; name: string; displayName: string; }
interface Dept { id: string; name: string; }
interface Team { id: string; name: string; deptId: string | null; }
interface User {
  id: string; email: string; fullName: string; phone?: string; avatar?: string;
  jobTitle?: string; status: 'ACTIVE' | 'INACTIVE' | 'INVITED';
  deptId?: string; teamId?: string; lastLoginAt?: string;
  dept?: Dept; team?: Team;
  userRoles: { role: Role }[];
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-zinc-100 text-zinc-500',
  INVITED: 'bg-yellow-100 text-yellow-700',
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoáº¡t Ä‘á»™ng', INACTIVE: 'VÃ´ hiá»‡u', INVITED: 'ÄÃ£ má»i',
};

// â”€â”€â”€ User Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const EMPTY_FORM = { fullName: '', email: '', phone: '', jobTitle: '', deptId: '', teamId: '', roleId: '', password: '' };

function UserModal({ user, onClose }: { user: User | null; onClose: () => void }) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = !!user;
  const [form, setForm] = useState(() => user
    ? { fullName: user.fullName, email: user.email, phone: user.phone ?? '', jobTitle: user.jobTitle ?? '',
        deptId: user.deptId ?? '', teamId: user.teamId ?? '',
        roleId: user.userRoles?.[0]?.role?.id ?? '', password: '' }
    : EMPTY_FORM
  );
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: roles = [] } = useQuery<Role[]>({ queryKey: ['rbac-roles'], queryFn: () => api.get('/rbac/roles').then(r => r.data) });
  const { data: depts = [] } = useQuery<Dept[]>({ queryKey: ['depts'], queryFn: () => api.get('/organizations/departments').then(r => r.data) });
  const { data: teams = [] } = useQuery<Team[]>({ queryKey: ['teams'], queryFn: () => api.get('/organizations/teams').then(r => r.data) });

  const filteredTeams = form.deptId ? teams.filter(t => t.deptId === form.deptId) : teams;

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/users', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Táº¡o ngÆ°á»i dÃ¹ng thÃ nh cÃ´ng'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Táº¡o tháº¥t báº¡i'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/users/${user!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Cáº­p nháº­t thÃ nh cÃ´ng'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cáº­p nháº­t tháº¥t báº¡i'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit) {
      const { password, email, roleId, ...rest } = form;
      updateMutation.mutate(rest);
    } else {
      createMutation.mutate(form);
    }
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900';
  const labelCls = 'block text-xs font-medium text-zinc-600 mb-1';

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">{isEdit ? 'Chá»‰nh sá»­a ngÆ°á»i dÃ¹ng' : 'ThÃªm ngÆ°á»i dÃ¹ng má»›i'}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Há» tÃªn *</label>
              <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Nguyá»…n VÄƒn A" required />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="email@company.com" required disabled={isEdit} />
            </div>
            <div>
              <label className={labelCls}>Sá»‘ Ä‘iá»‡n thoáº¡i</label>
              <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="0901234567" />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Chá»©c danh</label>
              <input className={inputCls} value={form.jobTitle} onChange={set('jobTitle')} placeholder="TrÆ°á»Ÿng phÃ²ng kinh doanh" />
            </div>
            <div>
              <label className={labelCls}>PhÃ²ng ban</label>
              <select className={inputCls} value={form.deptId} onChange={e => { set('deptId')(e); setForm(p => ({ ...p, deptId: e.target.value, teamId: '' })); }}>
                <option value="">-- Chá»n phÃ²ng ban --</option>
                {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>NhÃ³m</label>
              <select className={inputCls} value={form.teamId} onChange={set('teamId')}>
                <option value="">-- Chá»n nhÃ³m --</option>
                {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            {!isEdit && (
              <div>
                <label className={labelCls}>Vai trÃ²</label>
                <select className={inputCls} value={form.roleId} onChange={set('roleId')}>
                  <option value="">-- Chá»n vai trÃ² --</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                </select>
              </div>
            )}
            {!isEdit && (
              <div>
                <label className={labelCls}>Máº­t kháº©u *</label>
                <input className={inputCls} type="password" value={form.password} onChange={set('password')} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required={!isEdit} minLength={6} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Há»§y</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-60">
              {isPending ? 'Äang lÆ°u...' : isEdit ? 'LÆ°u thay Ä‘á»•i' : 'Táº¡o ngÆ°á»i dÃ¹ng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Slide-over Detail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function UserSlideOver({ userId, onClose, onEdit }: { userId: string; onClose: () => void; onEdit: (u: User) => void }) {
  const qc = useQueryClient();
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ['user', userId],
    queryFn: () => api.get(`/users/${userId}`).then(r => r.data),
  });
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['rbac-roles'],
    queryFn: () => api.get('/rbac/roles').then(r => r.data),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => api.patch(`/users/${userId}/deactivate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); qc.invalidateQueries({ queryKey: ['user', userId] }); toast.success('ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i'); },
    onError: () => toast.error('Thao tÃ¡c tháº¥t báº¡i'),
  });

  const assignRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.post(`/rbac/users/${userId}/roles/${roleId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', userId] }); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('ÄÃ£ gÃ¡n vai trÃ²'); },
    onError: () => toast.error('GÃ¡n vai trÃ² tháº¥t báº¡i'),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/rbac/users/${userId}/roles/${roleId}`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['user', userId] }); qc.invalidateQueries({ queryKey: ['users'] }); toast.success('ÄÃ£ xÃ³a vai trÃ²'); },
    onError: () => toast.error('XÃ³a vai trÃ² tháº¥t báº¡i'),
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">Chi tiáº¿t ngÆ°á»i dÃ¹ng</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Äang táº£i...</div>
        ) : user ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-5 border-b border-gray-50 flex items-start gap-4">
              <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                {user.avatar
                  ? <img src={user.avatar} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
                  : <span className="text-lg font-bold text-indigo-700">{getInitials(user.fullName)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-900">{user.fullName}</p>
                {user.jobTitle && <p className="text-sm text-zinc-500 mt-0.5">{user.jobTitle}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[user.status]}`}>
                    {STATUS_LABELS[user.status]}
                  </span>
                  {user.userRoles?.[0]?.role && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 text-indigo-700 rounded-full text-xs font-medium">
                      <Shield size={10} />{user.userRoles[0].role.displayName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="px-5 py-4 space-y-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">ThÃ´ng tin liÃªn há»‡</p>
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Äiá»‡n thoáº¡i" value={user.phone} />
            </div>

            <div className="px-5 py-4 space-y-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tá»• chá»©c</p>
              <InfoRow label="PhÃ²ng ban" value={user.dept?.name} />
              <InfoRow label="NhÃ³m" value={user.team?.name} />
            </div>

            {user.lastLoginAt && (
              <div className="px-5 py-4 border-b border-gray-50">
                <InfoRow label="ÄÄƒng nháº­p láº§n cuá»‘i" value={formatDate(user.lastLoginAt)} />
              </div>
            )}

            {/* Roles */}
            <div className="px-5 py-4 space-y-3 border-b border-gray-50">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Vai trÃ²</p>
              <div className="flex flex-wrap gap-2">
                {user.userRoles?.map(({ role }) => (
                  <div key={role.id} className="flex items-center gap-1 bg-zinc-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-medium">
                    <Shield size={11} />
                    {role.displayName}
                    <button
                      onClick={() => removeRoleMutation.mutate(role.id)}
                      disabled={removeRoleMutation.isPending}
                      className="ml-0.5 hover:text-red-500"
                      title="XÃ³a vai trÃ²"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {(!user.userRoles || user.userRoles.length === 0) && (
                  <p className="text-xs text-zinc-400">ChÆ°a cÃ³ vai trÃ²</p>
                )}
              </div>
              {/* Add role */}
              {allRoles.filter(r => !user.userRoles?.some(ur => ur.role.id === r.id)).length > 0 && (
                <select
                  value=""
                  onChange={e => { if (e.target.value) assignRoleMutation.mutate(e.target.value); }}
                  className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white text-zinc-600"
                >
                  <option value="">+ ThÃªm vai trÃ²...</option>
                  {allRoles
                    .filter(r => !user.userRoles?.some(ur => ur.role.id === r.id))
                    .map(r => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                </select>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 flex gap-2">
              <button
                onClick={() => onEdit(user)}
                className="flex-1 px-3 py-2 text-sm text-zinc-900 border border-indigo-200 rounded-lg hover:bg-zinc-50 flex items-center justify-center gap-1.5"
              >
                <Pencil size={14} />Chá»‰nh sá»­a
              </button>
              <button
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-1.5 border disabled:opacity-60 ${
                  user.status === 'ACTIVE'
                    ? 'text-red-600 border-red-200 hover:bg-red-50'
                    : 'text-green-600 border-green-200 hover:bg-green-50'
                }`}
              >
                {user.status === 'ACTIVE' ? <><UserX size={14} />VÃ´ hiá»‡u hÃ³a</> : <><UserCheck size={14} />KÃ­ch hoáº¡t</>}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs text-zinc-400 w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-800 flex-1 break-words">{value}</span>
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function UsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);

  // debounce
  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1); }, 350); return () => clearTimeout(t); }, [search]);

  const { data, isLoading } = useQuery<{ data: User[]; meta: any }>({
    queryKey: ['users', { search: q, page }],
    queryFn: () => api.get('/users', { params: { search: q || undefined, page, limit: 15 } }).then(r => r.data),
  });
  const users = data?.data ?? [];
  const meta = data?.meta;

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('ÄÃ£ xÃ³a ngÆ°á»i dÃ¹ng'); if (slideOverId) setSlideOverId(null); },
    onError: () => toast.error('XÃ³a tháº¥t báº¡i'),
  });

  const handleDelete = (u: User) => {
    if (!window.confirm(`XÃ³a ngÆ°á»i dÃ¹ng "${u.fullName}"?`)) return;
    deleteMutation.mutate(u.id);
  };

  const openCreate = () => { setEditingUser(null); setModalOpen(true); };
  const openEdit = (u: User) => { setEditingUser(u); setModalOpen(true); setSlideOverId(null); };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">NgÆ°á»i dÃ¹ng</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{meta?.total ?? 0} ngÆ°á»i dÃ¹ng trong há»‡ thá»‘ng</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus size={16} />ThÃªm ngÆ°á»i dÃ¹ng
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="TÃ¬m theo tÃªn, email..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">NgÆ°á»i dÃ¹ng</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden md:table-cell">Vai trÃ²</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden lg:table-cell">PhÃ²ng ban</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide hidden xl:table-cell">ÄÄƒng nháº­p cuá»‘i</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tráº¡ng thÃ¡i</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-zinc-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-400 text-sm">KhÃ´ng cÃ³ ngÆ°á»i dÃ¹ng nÃ o</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} onClick={() => setSlideOverId(u.id)}
                  className="hover:bg-zinc-50/60 transition-colors cursor-pointer group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                        {u.avatar
                          ? <img src={u.avatar} alt={u.fullName} className="w-full h-full rounded-full object-cover" />
                          : <span className="text-xs font-bold text-indigo-700">{getInitials(u.fullName)}</span>}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{u.fullName}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {u.userRoles?.[0]?.role
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-50 text-indigo-700 rounded-full text-xs font-medium">
                          <Shield size={10} />{u.userRoles[0].role.displayName}
                        </span>
                      : <span className="text-zinc-400 text-xs">â€”</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 hidden lg:table-cell">{u.dept?.name ?? 'â€”'}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden xl:table-cell">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'â€”'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[u.status]}`}>
                      {STATUS_LABELS[u.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <UserRowMenu user={u} onEdit={() => openEdit(u)} onDelete={() => handleDelete(u)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 bg-zinc-50">
            <p className="text-xs text-zinc-500">Trang {page}/{meta.totalPages} Â· {meta.total} ngÆ°á»i dÃ¹ng</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page <= 1}
                className="p-1.5 rounded text-zinc-500 hover:bg-gray-200 disabled:opacity-40"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= meta.totalPages}
                className="p-1.5 rounded text-zinc-500 hover:bg-gray-200 disabled:opacity-40"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && <UserModal user={editingUser} onClose={() => setModalOpen(false)} />}

      {/* Slide-over */}
      {slideOverId && (
        <UserSlideOver
          userId={slideOverId}
          onClose={() => setSlideOverId(null)}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}

function UserRowMenu({ user, onEdit, onDelete }: { user: User; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-zinc-200 z-10 overflow-hidden">
          <button onClick={() => { onEdit(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
            <Pencil size={13} />Chá»‰nh sá»­a
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            <Trash2 size={13} />XÃ³a
          </button>
        </div>
      )}
    </div>
  );
}
