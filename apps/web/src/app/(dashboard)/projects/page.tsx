'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, FolderOpen, CheckSquare, Calendar, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import { ProjectTable } from './project-table';
import {
  getDataTableQueryParams,
  parseDataTablePageSize,
  toggleVisibleSelection,
  type DataTablePageSize,
} from '@/components/ui/data-table-controls';
import { ModuleFilterToolbar } from '@/components/ui/module-filter-toolbar';

// ������ Types ������������������������������������������������������������������������������������������������������������������������������������������
interface Project {
  id: string; name: string; description?: string; status: string;
  startDate?: string; dueDate?: string; ownerId?: string; deptId?: string;
  owner?: { id: string; fullName: string; avatar?: string };
  dept?: { id: string; name: string };
  _count?: { tasks: number };
  progress?: { total: number; done: number; pending: number; overdue: number; blocked: number; percent: number };
  tasks?: Task[];
}
interface Task { id: string; title: string; status: string; isBlocked?: boolean; dueDate?: string; assignee?: { fullName: string }; }
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-zinc-100 text-zinc-600',
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

// ������ ProjectModal ��������������������������������������������������������������������������������������������������������������������������
const EMPTY_FORM = { name: '', description: '', status: 'PLANNING', startDate: '', dueDate: '', deptId: '' };

type ProjectForm = typeof EMPTY_FORM;

function buildProjectPayload(form: ProjectForm) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    status: form.status,
    startDate: form.startDate || undefined,
    dueDate: form.dueDate || undefined,
    deptId: form.deptId || undefined,
  };
}

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
    mutationFn: (payload: ReturnType<typeof buildProjectPayload>) => api.post('/projects', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Tạo dự án thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'T�o th�t b�i'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<ReturnType<typeof buildProjectPayload>>) => api.patch(`/projects/${project!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Cập nhật thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildProjectPayload(form);
    isEdit ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900';
  const labelCls = 'block text-xs font-medium text-zinc-600 mb-1';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">{isEdit ? 'Chỉnh sửa dự án' : 'Tạo dự án mới'}</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
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
              <label className={labelCls}>Ngày bắt �ầu</label>
              <input className={inputCls} type="date" value={form.startDate} onChange={set('startDate')} />
            </div>
            <div>
              <label className={labelCls}>Ngày kết thúc</label>
              <input className={inputCls} type="date" value={form.dueDate} onChange={set('dueDate')} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Hủy</button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-60">
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo dự án'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ������ Project Detail Slide-over ������������������������������������������������������������������������������������������������
function ProjectSlideOver({ projectId, onClose, onEdit }: { projectId: string; onClose: () => void; onEdit: (p: Project) => void }) {
  const { data: project, isLoading } = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then(r => r.data),
  });

  const tasksByStatus = TASK_STATUS_ORDER.reduce((acc, s) => {
    acc[s] = project?.tasks?.filter(t => t.status === s) ?? [];
    return acc;
  }, {} as Record<string, Task[]>);

  const totalTasks = project?.progress?.total ?? project?.tasks?.length ?? 0;
  const doneTasks = project?.progress?.done ?? project?.tasks?.filter(t => t.status === 'DONE').length ?? 0;
  const pendingTasks = project?.progress?.pending ?? 0;
  const overdueTasks = project?.progress?.overdue ?? 0;
  const blockedTasks = project?.progress?.blocked ?? 0;
  const progress = project?.progress?.percent ?? (totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">Chi tiết dự án</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-zinc-400 text-sm">Đang tải...</div>
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
                  <Pencil size={12} />Sửa
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
                  {project.startDate && project.dueDate && ' �  '}
                  {project.dueDate && formatDate(project.dueDate)}
                </div>
              )}
            </div>

            {/* Progress */}
            {totalTasks > 0 && (
              <div className="px-5 py-4 border-b border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tiến độ</span>
                  <span className="text-xs font-semibold text-zinc-700">{progress}%</span>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2">
                  <div className="bg-zinc-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-zinc-400 mt-1">{doneTasks}/{totalTasks} nhiệm vụ hoàn thành</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-amber-50 px-2 py-1.5 text-center text-xs text-amber-700">
                    {pendingTasks} pending
                  </div>
                  <div className="rounded-lg bg-rose-50 px-2 py-1.5 text-center text-xs text-rose-700">
                    {blockedTasks} khó khăn
                  </div>
                  <div className="rounded-lg bg-zinc-50 px-2 py-1.5 text-center text-xs text-zinc-600">
                    {overdueTasks} quá hạn
                  </div>
                </div>
              </div>
            )}

            {/* Tasks by status */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Nhiệm vụ</p>
              {totalTasks === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">Chưa có nhiệm vụ</p>
              ) : (
                TASK_STATUS_ORDER.map(s => tasksByStatus[s].length > 0 && (
                  <div key={s} className="mb-4">
                    <p className="text-xs font-medium text-zinc-500 mb-1.5">{TASK_STATUS_LABELS[s]} ({tasksByStatus[s].length})</p>
                    <div className="space-y-1">
                      {tasksByStatus[s].map(t => (
                        <div key={t.id} className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-lg">
                          <CheckSquare size={13} className={s === 'DONE' ? 'text-green-500' : 'text-zinc-300'} />
                          <span className={`flex-1 text-xs ${s === 'DONE' ? 'line-through text-zinc-400' : 'text-zinc-700'}`}>{t.title}</span>
                          {t.isBlocked && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">Khó khăn</span>}
                          {t.dueDate && s !== 'DONE' && new Date(t.dueDate) < new Date() && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600">Quá hạn</span>}
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

// ������ Project Card ��������������������������������������������������������������������������������������������������������������������������
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
            <span className="text-xs text-zinc-400">{doneTasks}/{totalTasks} nhi�!m vụ</span>
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

// ������ Main Page ��������������������������������������������������������������������������������������������������������������������������������
export default function ProjectsPage() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const urlStatus = searchParams.get('status') ?? '';
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<DataTablePageSize>(50);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (projectId) setSlideOverId(projectId);
  }, [searchParams]);

  const queryParams = {
    ...getDataTableQueryParams(page, pageSize),
    search: search || undefined,
    status: urlStatus || statusFilter || undefined,
  };

  const { data: projectResponse, isLoading } = useQuery<PaginatedResponse<Project>>({
    queryKey: ['projects', queryParams],
    queryFn: () => api.get('/projects', { params: queryParams }).then(r => r.data),
  });

  const projects = projectResponse?.data ?? [];
  const totalCount = projectResponse?.meta?.total ?? 0;
  const totalPages = projectResponse?.meta?.totalPages ?? 1;
  const currentPage = Math.min(page, Math.max(1, totalPages));

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Xóa dự án thành công');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      if (slideOverId === id) setSlideOverId(null);
    },
    onError: () => toast.error('Xóa dự án thất bại'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.post('/projects/bulk-delete', { ids }).then(r => r.data as { deletedIds: string[]; failedIds: string[]; count: number }),
    onSuccess: ({ deletedIds, failedIds }) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      if (slideOverId && deletedIds.includes(slideOverId)) setSlideOverId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        deletedIds.forEach((id) => next.delete(id));
        return next;
      });
      if (deletedIds.length > 0) toast.success(`Xóa ${deletedIds.length} dự án thành công`);
      if (failedIds.length > 0) toast.error(`${failedIds.length} dự án chưa thể xóa`);
    },
    onError: () => toast.error('Xóa dự án thất bại'),
  });

  const handleDelete = (p: Project) => {
    if (!window.confirm(`Xóa dự án "${p.name}"?`)) return;
    deleteMutation.mutate(p.id);
  };
  const openEdit = (p: Project) => { setEditingProject(p); setModalOpen(true); setSlideOverId(null); };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleVisibleRows = () => {
    setSelectedIds((prev) => toggleVisibleSelection(projects, prev));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const changeStatusFilter = (nextStatus: string) => {
    setStatusFilter(nextStatus);
    setPage(1);
    setSelectedIds(new Set());
  };

  const changePageSize = (value: string) => {
    const nextPageSize = parseDataTablePageSize(value);
    if (nextPageSize === 'all' && totalCount > 500 && !window.confirm(`Tối đa có ${totalCount} dự án? Thao tác này có thể chậm nếu dữ liệu lớn.`)) {
      return;
    }
    setPageSize(nextPageSize);
    setPage(1);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Xóa ${ids.length} dự án đã chọn?`)) return;
    bulkDeleteMutation.mutate(ids);
  };

  const counts = Object.keys(STATUS_LABELS).reduce((acc, s) => {
    acc[s] = statusFilter === s ? totalCount : 0;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Dự án</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{totalCount} dự án</p>
        </div>
        <button onClick={() => { setEditingProject(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
          <Plus size={16} />Tạo dự án
        </button>
      </div>

      <ModuleFilterToolbar
        searchPlaceholder="Tìm tên dự án, mô tả..."
        filters={[
          {
            key: 'status',
            label: 'Trạng thái',
            options: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
          },
        ]}
        onChange={() => {
          setPage(1);
          setSelectedIds(new Set());
        }}
      />

      {/* Status filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => changeStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!statusFilter ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-gray-200'}`}>
          Tất cả ({statusFilter ? '...' : totalCount})
        </button>
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => changeStatusFilter(k === statusFilter ? '' : k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === k ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-gray-200'}`}>
            {v}{statusFilter === k ? ` (${counts[k]})` : ''}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-zinc-200 rounded-xl p-5 h-36 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16 text-zinc-400">
          <FolderOpen size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Chưa có dự án nào</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-zinc-900 hover:underline">Tạo dự án mới</button>
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          selectedIds={selectedIds}
          page={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          onToggleRow={toggleRow}
          onToggleVisible={toggleVisibleRows}
          onClearSelection={clearSelection}
          onBulkDelete={handleBulkDelete}
          onPageChange={setPage}
          onPageSizeChange={changePageSize}
          onSelectProject={setSlideOverId}
          onEditProject={(id) => {
            const project = projects.find((item) => item.id === id);
            if (project) openEdit(project);
          }}
          onDeleteProject={(id) => {
            const project = projects.find((item) => item.id === id);
            if (project) handleDelete(project);
          }}
        />
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
