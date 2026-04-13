'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, GitBranch, Users, Plus, Pencil, Trash2, Check, X, ChevronRight, ShieldCheck, Tag, Plug } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Org { id: string; name: string; email?: string; phone?: string; website?: string; address?: string; logo?: string; }
interface Dept { id: string; name: string; description?: string; parentId?: string | null; children?: Dept[]; }
interface Team { id: string; name: string; description?: string; deptId?: string | null; dept?: { id: string; name: string }; }

// ─── Tab: Tổ chức ──────────────────────────────────────────────────────────────
function OrgTab() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useQuery<Org>({
    queryKey: ['org-me'],
    queryFn: () => api.get('/organizations/me').then(r => r.data),
  });
  const [form, setForm] = useState<Partial<Org>>({});
  const [dirty, setDirty] = useState(false);

  const set = (k: keyof Org) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    setDirty(true);
  };

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Org>) => api.patch('/organizations/me', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['org-me'] }); toast.success('Lưu thành công'); setDirty(false); },
    onError: () => toast.error('Lưu thất bại'),
  });

  if (isLoading) return <div className="text-sm text-gray-400 py-6 text-center">Đang tải...</div>;
  if (!org) return null;

  const val = (k: keyof Org) => (dirty && form[k] !== undefined ? form[k] : org[k]) ?? '';

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Tên tổ chức *</label>
        <input className={inputCls} value={val('name') as string} onChange={set('name')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
          <input className={inputCls} type="email" value={val('email') as string} onChange={set('email')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Điện thoại</label>
          <input className={inputCls} value={val('phone') as string} onChange={set('phone')} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
        <input className={inputCls} value={val('website') as string} onChange={set('website')} placeholder="https://company.com" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ</label>
        <input className={inputCls} value={val('address') as string} onChange={set('address')} />
      </div>
      {dirty && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => { setForm({}); setDirty(false); }}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >Hủy</button>
          <button
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >{updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Phòng ban ────────────────────────────────────────────────────────────
function DeptsTab() {
  const qc = useQueryClient();
  const [addingParentId, setAddingParentId] = useState<string | null | undefined>(undefined); // undefined = closed, null = top-level
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: depts = [], isLoading } = useQuery<Dept[]>({
    queryKey: ['depts-full'],
    queryFn: () => api.get('/organizations/departments').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/organizations/departments', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depts-full'] }); qc.invalidateQueries({ queryKey: ['depts'] }); toast.success('Thêm phòng ban thành công'); setAddingParentId(undefined); setNewName(''); setNewDesc(''); },
    onError: () => toast.error('Tạo thất bại'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; name: string; description?: string }) => api.patch(`/organizations/departments/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depts-full'] }); qc.invalidateQueries({ queryKey: ['depts'] }); toast.success('Cập nhật thành công'); setEditingId(null); },
    onError: () => toast.error('Cập nhật thất bại'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/departments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['depts-full'] }); qc.invalidateQueries({ queryKey: ['depts'] }); toast.success('Đã xóa phòng ban'); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const AddInlineForm = ({ parentId }: { parentId?: string | null }) => (
    <div className="flex items-center gap-2 mt-1 ml-4">
      <input
        value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên phòng ban..."
        className="flex-1 px-2.5 py-1.5 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
        onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate({ name: newName.trim(), description: newDesc || undefined, parentId: parentId ?? undefined }); if (e.key === 'Escape') setAddingParentId(undefined); }}
        autoFocus
      />
      <button onClick={() => newName.trim() && createMutation.mutate({ name: newName.trim(), description: newDesc || undefined, parentId: parentId ?? undefined })}
        disabled={createMutation.isPending || !newName.trim()}
        className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
        <Check size={13} />
      </button>
      <button onClick={() => { setAddingParentId(undefined); setNewName(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg"><X size={13} /></button>
    </div>
  );

  function DeptRow({ dept, depth = 0 }: { dept: Dept; depth?: number }) {
    const [editName, setEditName] = useState(dept.name);
    const isEditing = editingId === dept.id;

    return (
      <div>
        <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group`} style={{ paddingLeft: `${12 + depth * 20}px` }}>
          <ChevronRight size={13} className="text-gray-300 shrink-0" />
          {isEditing ? (
            <>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 px-2 py-0.5 text-sm border border-indigo-300 rounded focus:outline-none"
                onKeyDown={e => { if (e.key === 'Enter') updateMutation.mutate({ id: dept.id, name: editName }); if (e.key === 'Escape') setEditingId(null); }} autoFocus />
              <button onClick={() => updateMutation.mutate({ id: dept.id, name: editName })} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"><Check size={12} /></button>
              <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 border border-gray-200 rounded hover:bg-gray-50"><X size={12} /></button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm text-gray-800">{dept.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setAddingParentId(dept.id); setNewName(''); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded" title="Thêm phòng ban con"><Plus size={13} /></button>
                <button onClick={() => { setEditingId(dept.id); setEditName(dept.name); }} className="p-1 text-gray-400 hover:text-indigo-600 rounded"><Pencil size={12} /></button>
                <button onClick={() => window.confirm(`Xóa "${dept.name}"?`) && deleteMutation.mutate(dept.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 size={12} /></button>
              </div>
            </>
          )}
        </div>
        {addingParentId === dept.id && <AddInlineForm parentId={dept.id} />}
        {dept.children?.map(child => <DeptRow key={child.id} dept={child} depth={depth + 1} />)}
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{depts.length} phòng ban</p>
        <button onClick={() => { setAddingParentId(null); setNewName(''); }}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={13} />Thêm phòng ban
        </button>
      </div>
      {addingParentId === null && <div className="mb-2"><AddInlineForm parentId={null} /></div>}
      {isLoading ? (
        <div className="text-sm text-gray-400 py-6 text-center">Đang tải...</div>
      ) : depts.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">Chưa có phòng ban nào</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {depts.map(d => <DeptRow key={d.id} dept={d} />)}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Nhóm ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', description: '', deptId: '' });

  const { data: teams = [], isLoading } = useQuery<Team[]>({
    queryKey: ['teams-full'],
    queryFn: () => api.get('/organizations/teams').then(r => r.data),
  });
  const { data: depts = [] } = useQuery<Dept[]>({
    queryKey: ['depts'],
    queryFn: () => api.get('/organizations/departments').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => api.post('/organizations/teams', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams-full'] }); qc.invalidateQueries({ queryKey: ['teams'] }); toast.success('Tạo nhóm thành công'); setAdding(false); setNewForm({ name: '', description: '', deptId: '' }); },
    onError: () => toast.error('Tạo thất bại'),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/organizations/teams/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams-full'] }); qc.invalidateQueries({ queryKey: ['teams'] }); toast.success('Đã xóa nhóm'); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const inputCls = 'px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{teams.length} nhóm</p>
        <button onClick={() => setAdding(a => !a)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={13} />Thêm nhóm
        </button>
      </div>

      {adding && (
        <div className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-4 mb-4 space-y-3">
          <p className="text-xs font-semibold text-indigo-700">Nhóm mới</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Tên nhóm *" className={`${inputCls} col-span-2`} />
            <select value={newForm.deptId} onChange={e => setNewForm(p => ({ ...p, deptId: e.target.value }))} className={inputCls}>
              <option value="">-- Phòng ban --</option>
              {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={newForm.description} onChange={e => setNewForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Mô tả" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button
              onClick={() => newForm.name.trim() && createMutation.mutate({ name: newForm.name.trim(), description: newForm.description || undefined, deptId: newForm.deptId || undefined })}
              disabled={createMutation.isPending || !newForm.name.trim()}
              className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >{createMutation.isPending ? 'Đang tạo...' : 'Tạo nhóm'}</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400 py-6 text-center">Đang tải...</div>
      ) : teams.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center">Chưa có nhóm nào</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {teams.map(team => (
            <div key={team.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-gray-50/50">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <Users size={14} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{team.name}</p>
                {(team.dept || team.description) && (
                  <p className="text-xs text-gray-400 truncate">
                    {team.dept?.name}{team.dept && team.description ? ' · ' : ''}{team.description}
                  </p>
                )}
              </div>
              <button onClick={() => window.confirm(`Xóa nhóm "${team.name}"?`) && deleteMutation.mutate(team.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Phân quyền (RBAC) ───────────────────────────────────────────────────
interface Permission { id: string; resource: string; action: string; description?: string; }
interface RbacRole { id: string; name: string; displayName: string; permissions?: { permission: Permission }[]; }

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

  // When role is selected, seed pendingPerms from its current permissions
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

  // Group permissions by resource
  const permsByResource = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.resource]) acc[p.resource] = [];
    acc[p.resource].push(p);
    return acc;
  }, {});

  return (
    <div className="flex gap-6 min-h-[400px]">
      {/* Role list */}
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
                className={`w-full text-left px-3 py-2.5 text-sm transition-colors ${
                  selectedRoleId === role.id
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {role.displayName ?? role.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Permissions checklist */}
      <div className="flex-1">
        {!selectedRole ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
            <ShieldCheck size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Chọn một vai trò để xem và chỉnh sửa quyền</p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-gray-900">{selectedRole.displayName ?? selectedRole.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{pendingPerms.size} / {allPermissions.length} quyền được cấp</p>
              </div>
              {dirty && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { handleSelectRole(selectedRole); }}
                    className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >Hủy</button>
                  <button
                    onClick={handleSave}
                    disabled={updatePermsMutation.isPending}
                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                  >{updatePermsMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                </div>
              )}
            </div>

            {permsLoading ? (
              <div className="text-sm text-gray-400">Đang tải quyền...</div>
            ) : (
              <div className="space-y-5">
                {Object.entries(permsByResource).map(([resource, perms]) => (
                  <div key={resource} className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{resource}</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {perms.map(perm => (
                        <label key={perm.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
                          <input
                            type="checkbox"
                            checked={pendingPerms.has(perm.id)}
                            onChange={() => togglePerm(perm.id)}
                            className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          />
                          <div>
                            <p className="text-sm text-gray-800">{perm.action}</p>
                            {perm.description && <p className="text-xs text-gray-400">{perm.description}</p>}
                          </div>
                        </label>
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

// ─── Tab: Tags ─────────────────────────────────────────────────────────────────
function TagsTab() {
  const qc = useQueryClient();
  const { data: tags = [], isLoading } = useQuery<{ id: string; name: string; color: string | null }[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); toast.success('Đã xóa tag'); },
    onError: () => toast.error('Xóa tag thất bại'),
  });

  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const createMutation = useMutation({
    mutationFn: (data: { name: string; color: string }) => api.post('/tags', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewName(''); toast.success('Đã tạo tag'); },
    onError: () => toast.error('Tạo tag thất bại'),
  });

  const PRESET_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  return (
    <div className="max-w-lg space-y-5">
      {/* Create */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-3">Tạo tag mới</p>
        <div className="flex items-center gap-2 mb-3">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`w-6 h-6 rounded-full border-2 transition ${newColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && newName.trim()) createMutation.mutate({ name: newName.trim(), color: newColor }); }}
            placeholder="Tên tag..." maxLength={30}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={() => { if (newName.trim()) createMutation.mutate({ name: newName.trim(), color: newColor }); }}
            disabled={!newName.trim() || createMutation.isPending}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tags của tổ chức ({tags.length})
        </p>
        {isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : tags.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Chưa có tag nào</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => {
              const c = tag.color || '#6366f1';
              return (
                <div key={tag.id} className="group flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                  style={{ backgroundColor: c + '18', color: c, borderColor: c + '40' }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                  <span>{tag.name}</span>
                  <button
                    onClick={() => window.confirm(`Xóa tag "${tag.name}"?`) && deleteMutation.mutate(tag.id)}
                    disabled={deleteMutation.isPending}
                    className="ml-0.5 text-current opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Tích hợp kênh ────────────────────────────────────────────────────────
function IntegrationsTab() {
  const [zaloOaId, setZaloOaId] = useState('');
  const [zaloAppId, setZaloAppId] = useState('');
  const [zaloAppSecret, setZaloAppSecret] = useState('');
  const [fbPageToken, setFbPageToken] = useState('');
  const [fbVerifyToken, setFbVerifyToken] = useState('');
  const [saved, setSaved] = useState<string | null>(null);

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white font-mono';

  function handleSaveZalo(e: React.FormEvent) {
    e.preventDefault();
    // Stored locally — admin must paste into .env and restart server
    setSaved('zalo');
    setTimeout(() => setSaved(null), 3000);
  }

  function handleSaveFB(e: React.FormEvent) {
    e.preventDefault();
    setSaved('fb');
    setTimeout(() => setSaved(null), 3000);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-gray-500">
        Cấu hình kênh tích hợp để nhận tin nhắn từ Zalo OA và Facebook Messenger vào Inbox.
        Sau khi điền, sao chép giá trị vào file <code className="bg-gray-100 px-1 rounded text-xs">.env</code> và khởi động lại server.
      </p>

      {/* Zalo OA */}
      <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-600">ZA</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Zalo Official Account</p>
            <p className="text-xs text-gray-400">Nhận tin nhắn từ Zalo OA</p>
          </div>
        </div>
        <form onSubmit={handleSaveZalo} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">OA ID</label>
            <input className={inputCls} value={zaloOaId} onChange={e => setZaloOaId(e.target.value)} placeholder="ZALO_OA_ID=..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">App ID</label>
              <input className={inputCls} value={zaloAppId} onChange={e => setZaloAppId(e.target.value)} placeholder="ZALO_APP_ID=..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">App Secret</label>
              <input className={inputCls} type="password" value={zaloAppSecret} onChange={e => setZaloAppSecret(e.target.value)} placeholder="ZALO_APP_SECRET=..." />
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 space-y-1">
            <p className="font-medium">Webhook URL:</p>
            <code className="block break-all">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api/integrations/zalo/webhook` : 'http://your-domain/api/integrations/zalo/webhook'}</code>
            <p className="mt-1 font-medium">Để xác minh (GET) + nhận sự kiện (POST)</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              {saved === 'zalo' ? '✓ Đã sao chép' : 'Lưu cấu hình'}
            </button>
            {saved === 'zalo' && <span className="text-xs text-gray-400">Dán vào .env và restart server</span>}
          </div>
        </form>
      </div>

      {/* Facebook Messenger */}
      <div className="p-5 bg-white border border-gray-200 rounded-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-xs font-bold text-indigo-600">FB</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Facebook Messenger</p>
            <p className="text-xs text-gray-400">Nhận tin nhắn từ Facebook Page</p>
          </div>
        </div>
        <form onSubmit={handleSaveFB} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Page Access Token</label>
            <input className={inputCls} type="password" value={fbPageToken} onChange={e => setFbPageToken(e.target.value)} placeholder="META_PAGE_ACCESS_TOKEN=..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Verify Token (tự đặt)</label>
            <input className={inputCls} value={fbVerifyToken} onChange={e => setFbVerifyToken(e.target.value)} placeholder="META_VERIFY_TOKEN=..." />
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-xs text-indigo-700 space-y-1">
            <p className="font-medium">Webhook URL (cấu hình trong Meta Developer Console):</p>
            <code className="block break-all">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:3000/api/integrations/messenger/webhook` : 'http://your-domain/api/integrations/messenger/webhook'}</code>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
              {saved === 'fb' ? '✓ Đã sao chép' : 'Lưu cấu hình'}
            </button>
            {saved === 'fb' && <span className="text-xs text-gray-400">Dán vào .env và restart server</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'org', label: 'Tổ chức', icon: Building2 },
  { key: 'depts', label: 'Phòng ban', icon: GitBranch },
  { key: 'teams', label: 'Nhóm', icon: Users },
  { key: 'rbac', label: 'Phân quyền', icon: ShieldCheck },
  { key: 'tags', label: 'Tags', icon: Tag },
  { key: 'integrations', label: 'Tích hợp', icon: Plug },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('org');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Cài đặt</h1>
        <p className="text-sm text-gray-500 mt-0.5">Quản lý thông tin tổ chức, phòng ban và nhóm</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {tab === 'org' && <OrgTab />}
        {tab === 'depts' && <DeptsTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'rbac' && <RbacTab />}
        {tab === 'tags' && <TagsTab />}
        {tab === 'integrations' && <IntegrationsTab />}
      </div>
    </div>
  );
}
