'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, FolderOpen, CheckSquare, Calendar, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Project {
  id: string; name: string; description?: string; status: string;
  startDate?: string; dueDate?: string; ownerId?: string; deptId?: string;
  owner?: { id: string; fullName: string; avatar?: string };
  dept?: { id: string; name: string };
  _count?: { tasks: number };
  tasks?: Task[];
}
interface Task { id: string; title: string; status: string; assignee?: { fullName: string }; }

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Lên kế hoạch', ACTIVE: 'Đang chạy', ON_HOLD: 'Tạm dừng',
  COMPLETED: 'Hoàn thành', CANCELLED: 'Huỷ bỏ',
};
const TASK_STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', REVIEW: 'Đang review', DONE: 'Xong',
};

// ─── ProjectModal ─────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: '', description: '', status: 'PLANNING', startDate: '', dueDate: '', deptId: '' };

function ProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = !!project;
  const [form, setForm] = useState(() => project
    ? { name: project.name, description: project.description ?? '', status: project.status,
        startDate: project.startDate?.slice(0, 10) ?? '', dueDate: project.dueDate?.slice(0, 10) ?? '',
        deptId: project.deptId ?? '' }
    : EMPTY_FORM
  );
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: depts = [] } = useQuery<any[]>({
    queryKey: ['depts'], queryFn: () => api.get('/organizations/departments').then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/projects', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Tạo dự án thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Tạo thất bại'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/projects/${project!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Cập nhật thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, startDate: form.startDate || undefined, dueDate: form.dueDate || undefined, deptId: form.deptId || undefined };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload as typeof form);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{isEdit ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Tên dự án *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="Tên dự án" />
          </div>
          <div>
            <label className={labelCls}>Mô tả</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="Mô tả ngắn về dự án..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Trạng thái</label>
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Phòng ban</label>
              <select className={inputCls} value={form.deptId} onChange={set('deptId')}>
                <option value="">-- Chọn phòng ban --</option>
                {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Ngày bắt đầu</label>
              <input className={inputCls} type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div>
              <label className={labelCls}>Ngày kết thúc</label>
              <input className={inputCls} type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Project Detail Slide-over ────────────────────────────────────────────────
function ProjectSlideOver({ projectId, onClose, onEdit }: { projectId: string; onClose: () => void; onEdit: (p: Project) => void }) {
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const tasksByStatus = TASK_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = project?.tasks?.filter(t => t.status === s) ?? [];
    return acc;
  }, {} as Record<string, Task[]>);

  const totalTasks = project?.tasks?.length ?? 0;
  const doneTasks = project?.tasks?.filter(t => t.status === 'DONE').length ?? 0;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-gray-900">Chi tiết dự án</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Đang tải...</div>
        ) : project ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-5 border-b border-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-base leading-snug">{project.name}</p>
                  {project.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                    {project.dept && (
                      <span className="text-xs text-gray-400">{project.dept.name}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => onEdit(project)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Pencil size={12} />Sửa
                </button>
              </div>
            </div>

            {/* Meta */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-2 text-sm">
              {project.owner && (
                <div className="flex items-center gap-2.5 text-gray-600">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-indigo-700">{getInitials(project.owner.fullName)}</span>
                  </div>
                  <span className="text-xs">{project.owner.fullName}</span>
                </div>
              )}
              {(project.startDate || project.dueDate) && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  {project.startDate && formatDate(project.startDate)}
                  {project.startDate && project.dueDate && ' → '}
                  {project.dueDate && formatDate(project.dueDate)}
                </div>
              )}
            </div>

            {/* Progress */}
            {totalTasks > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tiến độ</span>
                  <span className="text-xs font-semibold text-gray-700">{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{doneTasks}/{totalTasks} nhiệm vụ hoàn thành</p>
              </div>
            )}

            {/* Tasks by status */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Nhiệm vụ</p>
              {totalTasks === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Chưa có nhiệm vụ</p>
              ) : (
                TASK_STATUS_ORDER.map(s => tasksByStatus[s].length > 0 && (
                  <div key={s} className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">{TASK_STATUS_LABELS[s]} ({tasksByStatus[s].length})</p>
                    <div className="space-y-1">
                      {tasksByStatus[s].map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                          <CheckSquare size={13} className={s === 'DONE' ? 'text-green-500' : 'text-gray-300'} />
                          <span className={`flex-1 text-xs ${s === 'DONE' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                          {t.assignee && <span className="text-xs text-gray-400">{t.assignee.fullName}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onEdit, onDelete, onSelect }: {
  project: Project; onEdit: () => void; onDelete: () => void; onSelect: () => void;
}) {
  const totalTasks = project._count?.tasks ?? 0;
  const doneTasks = project.tasks?.filter(t => t.status === 'DONE').length ?? 0;
  const progress = totalTasks > 0 ? Math.min(100, Math.round((doneTasks / totalTasks) * 100)) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition-all cursor-pointer group" onClick={onSelect}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={15} className="text-indigo-500 shrink-0" />
            <h3 className="text-sm font-semibold text-gray-900 truncate">{project.name}</h3>
          </div>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Pencil size={13} /></button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{doneTasks}/{totalTasks} nhiệm vụ</span>
            <span className="text-xs font-medium text-gray-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          {project.owner && (
            <>
              <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-700">{project.owner.fullName?.charAt(0)}</span>
              </div>
              <span>{project.owner.fullName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {project.dept && <span className="text-gray-400">{project.dept.name}</span>}
          {(project.startDate || project.dueDate) && (
            <div className="flex items-center gap-1">
              <Calendar size={11} />
              {project.dueDate ? formatDate(project.dueDate) : formatDate(project.startDate!)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Đã xóa dự án'); if (slideOverId) setSlideOverId(null); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const handleDelete = (p: Project) => {
    if (!window.confirm(`Xóa dự án "${p.name}"?`)) return;
    deleteMutation.mutate(p.id);
  };
  const openEdit = (p: Project) => { setEditingProject(p); setModalOpen(true); setSlideOverId(null); };

  const filtered = statusFilter ? projects.filter(p => p.status === statusFilter) : projects;

  const counts = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = projects.filter(p => p.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dự án</h1>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} dự án</p>
        </div>
        <button onClick={() => { setEditingProject(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus size={16} />Tạo dự án
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Tất cả ({projects.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => counts[k] > 0 && (
          <button key={k} onClick={() => setStatusFilter(k === statusFilter ? '' : k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {v} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <FolderOpen size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Chưa có dự án nào</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-indigo-600 hover:underline">Tạo dự án đầu tiên</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onEdit={() => openEdit(p)}
              onDelete={() => handleDelete(p)}
              onSelect={() => setSlideOverId(p.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && <ProjectModal project={editingProject} onClose={() => setModalOpen(false)} />}

      {/* Slide-over */}
      {slideOverId && (
        <ProjectSlideOver
          projectId={slideOverId}
          onClose={() => setSlideOverId(null)}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}
