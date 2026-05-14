'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, FolderOpen, CheckSquare, Calendar, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from 'sonner';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  PLANNING: 'bg-zinc-100 text-zinc-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};
const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'LÃªn káº¿ hoáº¡ch', ACTIVE: 'Äang cháº¡y', ON_HOLD: 'Táº¡m dá»«ng',
  COMPLETED: 'HoÃ n thÃ nh', CANCELLED: 'Huá»· bá»',
};
const TASK_STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const TASK_STATUS_LABELS: Record<string, string> = {
  TODO: 'Cáº§n lÃ m', IN_PROGRESS: 'Äang lÃ m', REVIEW: 'Äang review', DONE: 'Xong',
};

// â”€â”€â”€ ProjectModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Táº¡o dá»± Ã¡n thÃ nh cÃ´ng'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Táº¡o tháº¥t báº¡i'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/projects/${project!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Cáº­p nháº­t thÃ nh cÃ´ng'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cáº­p nháº­t tháº¥t báº¡i'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, startDate: form.startDate || undefined, dueDate: form.dueDate || undefined, deptId: form.deptId || undefined };
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload as typeof form);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900';
  const labelCls = 'block text-xs font-medium text-zinc-600 mb-1';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">{isEdit ? 'Chá»‰nh sá»­a dá»± Ã¡n' : 'Táº¡o dá»± Ã¡n má»›i'}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>TÃªn dá»± Ã¡n *</label>
            <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="TÃªn dá»± Ã¡n" />
          </div>
          <div>
            <label className={labelCls}>MÃ´ táº£</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={set('description')} placeholder="MÃ´ táº£ ngáº¯n vá» dá»± Ã¡n..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Tráº¡ng thÃ¡i</label>
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>PhÃ²ng ban</label>
              <select className={inputCls} value={form.deptId} onChange={set('deptId')}>
                <option value="">-- Chá»n phÃ²ng ban --</option>
                {depts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>NgÃ y báº¯t Ä‘áº§u</label>
              <input className={inputCls} type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div>
              <label className={labelCls}>NgÃ y káº¿t thÃºc</label>
              <input className={inputCls} type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Há»§y</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-60">
              {isPending ? 'Äang lÆ°u...' : isEdit ? 'LÆ°u thay Ä‘á»•i' : 'Táº¡o dá»± Ã¡n'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Project Detail Slide-over â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">Chi tiáº¿t dá»± Ã¡n</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Äang táº£i...</div>
        ) : project ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header */}
            <div className="px-5 py-5 border-b border-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-base leading-snug">{project.name}</p>
                  {project.description && <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{project.description}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status]}`}>
                      {STATUS_LABELS[project.status]}
                    </span>
                    {project.dept && (
                      <span className="text-xs text-zinc-400">{project.dept.name}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => onEdit(project)} className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">
                  <Pencil size={12} />Sá»­a
                </button>
              </div>
            </div>

            {/* Meta */}
            <div className="px-5 py-4 border-b border-gray-50 space-y-2 text-sm">
              {project.owner && (
                <div className="flex items-center gap-2.5 text-zinc-600">
                  <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-semibold text-indigo-700">{getInitials(project.owner.fullName)}</span>
                  </div>
                  <span className="text-xs">{project.owner.fullName}</span>
                </div>
              )}
              {(project.startDate || project.dueDate) && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar size={13} className="text-zinc-400 shrink-0" />
                  {project.startDate && formatDate(project.startDate)}
                  {project.startDate && project.dueDate && ' â†’ '}
                  {project.dueDate && formatDate(project.dueDate)}
                </div>
              )}
            </div>

            {/* Progress */}
            {totalTasks > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tiáº¿n Ä‘á»™</span>
                  <span className="text-xs font-semibold text-zinc-700">{progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div className="bg-zinc-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{doneTasks}/{totalTasks} nhiá»‡m vá»¥ hoÃ n thÃ nh</p>
              </div>
            )}

            {/* Tasks by status */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Nhiá»‡m vá»¥</p>
              {totalTasks === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">ChÆ°a cÃ³ nhiá»‡m vá»¥</p>
              ) : (
                TASK_STATUS_ORDER.map(s => tasksByStatus[s].length > 0 && (
                  <div key={s} className="mb-4">
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">{TASK_STATUS_LABELS[s]} ({tasksByStatus[s].length})</p>
                    <div className="space-y-1">
                      {tasksByStatus[s].map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg">
                          <CheckSquare size={13} className={s === 'DONE' ? 'text-green-500' : 'text-zinc-300'} />
                          <span className={`flex-1 text-xs ${s === 'DONE' ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{t.title}</span>
                          {t.assignee && <span className="text-xs text-zinc-400">{t.assignee.fullName}</span>}
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

// â”€â”€â”€ Project Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ProjectCard({ project, onEdit, onDelete, onSelect }: {
  project: Project; onEdit: () => void; onDelete: () => void; onSelect: () => void;
}) {
  const totalTasks = project._count?.tasks ?? 0;
  const doneTasks = project.tasks?.filter(t => t.status === 'DONE').length ?? 0;
  const progress = totalTasks > 0 ? Math.min(100, Math.round((doneTasks / totalTasks) * 100)) : 0;

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-sm transition-all cursor-pointer group" onClick={onSelect}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={15} className="text-indigo-500 shrink-0" />
            <h3 className="text-sm font-semibold text-zinc-900 truncate">{project.name}</h3>
          </div>
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status]}`}>
            {STATUS_LABELS[project.status]}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"><Pencil size={13} /></button>
          <button onClick={onDelete} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>
        </div>
      </div>

      {project.description && (
        <p className="text-xs text-zinc-500 line-clamp-2 mb-3">{project.description}</p>
      )}

      {/* Progress */}
      {totalTasks > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-400">{doneTasks}/{totalTasks} nhiá»‡m vá»¥</span>
            <span className="text-xs font-medium text-zinc-600">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div className="bg-zinc-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          {project.owner && (
            <>
              <div className="w-5 h-5 bg-zinc-100 rounded-full flex items-center justify-center">
                <span className="text-[10px] font-bold text-indigo-700">{project.owner.fullName?.charAt(0)}</span>
              </div>
              <span>{project.owner.fullName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {project.dept && <span className="text-zinc-400">{project.dept.name}</span>}
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

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('ÄÃ£ xÃ³a dá»± Ã¡n'); if (slideOverId) setSlideOverId(null); },
    onError: () => toast.error('XÃ³a tháº¥t báº¡i'),
  });

  const handleDelete = (p: Project) => {
    if (!window.confirm(`XÃ³a dá»± Ã¡n "${p.name}"?`)) return;
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
          <h1 className="text-xl font-bold text-zinc-900">Dá»± Ã¡n</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{projects.length} dá»± Ã¡n</p>
        </div>
        <button onClick={() => { setEditingProject(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus size={16} />Táº¡o dá»± Ã¡n
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-gray-200'}`}>
          Táº¥t cáº£ ({projects.length})
        </button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => counts[k] > 0 && (
          <button key={k} onClick={() => setStatusFilter(k === statusFilter ? '' : k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === k ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-gray-200'}`}>
            {v} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16 text-zinc-400">
          <FolderOpen size={36} className="mb-3 opacity-30" />
          <p className="text-sm">ChÆ°a cÃ³ dá»± Ã¡n nÃ o</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-zinc-900 hover:underline">Táº¡o dá»± Ã¡n Ä‘áº§u tiÃªn</button>
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
