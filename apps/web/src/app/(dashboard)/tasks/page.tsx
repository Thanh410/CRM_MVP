'use client';

import { useState, useRef } from 'react';
import { Pencil, Trash2, MessageSquare, X, Eye, UserPlus, LayoutGrid, List, CheckSquare } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  useTasksKanban,
  useMoveTaskStatus,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useAddTaskComment,
  useAddWatcher,
  useRemoveWatcher,
  useTask,
  useProjects,
  type Task,
} from '@/hooks/use-tasks';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EntityTimeline } from '@/components/entity-timeline';
import { toast } from 'sonner';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Cáº§n lÃ m',
  IN_PROGRESS: 'Äang lÃ m',
  REVIEW: 'Äang xem xÃ©t',
  DONE: 'HoÃ n thÃ nh',
};

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-zinc-100',
  IN_PROGRESS: 'bg-blue-50',
  REVIEW: 'bg-yellow-50',
  DONE: 'bg-green-50',
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW: 'bg-zinc-100 text-zinc-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Tháº¥p',
  MEDIUM: 'Trung bÃ¬nh',
  HIGH: 'Cao',
  URGENT: 'Kháº©n cáº¥p',
};

// â”€â”€â”€ Users hook (inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useUsers() {
  return useQuery({
    queryKey: ['users', 'select'],
    queryFn: async () => {
      const res = await api.get('/users?limit=50');
      return res.data?.data ?? res.data ?? [];
    },
  });
}

// â”€â”€â”€ TaskEditModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [form, setForm] = useState({
    title: task.title,
    description: task.description ?? '',
    priority: task.priority,
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    assigneeId: task.assignee?.id ?? '',
    projectId: task.project?.id ?? '',
  });
  const update = useUpdateTask();
  const { data: users } = useUsers();
  const { data: projects } = useProjects();
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await update.mutateAsync({
      id: task.id,
      data: {
        title: form.title,
        description: form.description || undefined,
        priority: form.priority as Task['priority'],
        dueDate: form.dueDate || undefined,
        assigneeId: form.assigneeId || undefined,
        projectId: form.projectId || undefined,
      } as any,
    });
    toast.success('ÄÃ£ cáº­p nháº­t nhiá»‡m vá»¥');
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Chá»‰nh sá»­a nhiá»‡m vá»¥</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">TiÃªu Ä‘á» *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:border-transparent"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">MÃ´ táº£</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:border-transparent resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="MÃ´ táº£ nhiá»‡m vá»¥..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Æ¯u tiÃªn</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Task['priority'] }))}
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Háº¡n chÃ³t</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">NgÆ°á»i thá»±c hiá»‡n</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
              value={form.assigneeId}
              onChange={(e) => setForm((f) => ({ ...f, assigneeId: e.target.value }))}
            >
              <option value="">-- ChÆ°a gÃ¡n --</option>
              {(users ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{u.fullName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Dá»± Ã¡n</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            >
              <option value="">-- KhÃ´ng gÃ¡n --</option>
              {(projects ?? []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={update.isPending}
              className="flex-1 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
            >
              {update.isPending ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Há»§y
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ TaskDetailSlideOver â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskDetailSlideOver({ taskId, onClose }: { taskId: string; onClose: () => void }) {
  const { data: task, isLoading } = useTask(taskId);
  const addComment = useAddTaskComment();
  const addWatcher = useAddWatcher();
  const removeWatcher = useRemoveWatcher();
  const { data: allUsers = [] } = useQuery({ queryKey: ['users', 'select'], queryFn: () => api.get('/users?limit=50').then(r => r.data?.data ?? r.data ?? []) });
  const [comment, setComment] = useState('');
  const [showWatcherPicker, setShowWatcherPicker] = useState(false);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await addComment.mutateAsync({ id: taskId, content: comment });
    setComment('');
    toast.success('ÄÃ£ thÃªm bÃ¬nh luáº­n');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold text-zinc-900 truncate pr-4">
            {isLoading ? 'Äang táº£i...' : task?.title}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-100 rounded-lg">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full" />
          </div>
        ) : task ? (
          <div className="flex-1 overflow-y-auto">
            {/* Task Meta */}
            <div className="p-4 border-b space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[task.priority]}`}>
                  {PRIORITY_LABELS[task.priority]}
                </span>
                <span className="text-xs bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-full">
                  {STATUS_LABELS[task.status]}
                </span>
              </div>
              {task.description && (
                <p className="text-sm text-zinc-600">{task.description}</p>
              )}
              <div className="flex gap-4 text-xs text-zinc-500 flex-wrap">
                {task.assignee && (
                  <span>ðŸ‘¤ {task.assignee.fullName}</span>
                )}
                {task.dueDate && (
                  <span>ðŸ“… {new Date(task.dueDate).toLocaleDateString('vi-VN')}</span>
                )}
                {task.project && (
                  <span>ðŸ“ {task.project.name}</span>
                )}
              </div>
            </div>

            {/* Comments */}
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                BÃ¬nh luáº­n ({task.comments?.length ?? 0})
              </h3>

              <div className="space-y-3 mb-4">
                {task.comments?.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-700 flex-shrink-0">
                      {c.author?.fullName?.[0] ?? '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-gray-800">{c.author?.fullName ?? 'áº¨n danh'}</span>
                        <span className="text-xs text-zinc-400">
                          {new Date(c.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-700">{c.content}</p>
                    </div>
                  </div>
                ))}
                {(!task.comments || task.comments.length === 0) && (
                  <p className="text-xs text-zinc-400 text-center py-2">ChÆ°a cÃ³ bÃ¬nh luáº­n</p>
                )}
              </div>

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:border-transparent"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="ThÃªm bÃ¬nh luáº­n..."
                />
                <button
                  type="submit"
                  disabled={addComment.isPending || !comment.trim()}
                  className="bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
                >
                  Gá»­i
                </button>
              </form>
            </div>

            {/* Watchers */}
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  NgÆ°á»i theo dÃµi ({task.watchers?.length ?? 0})
                </h3>
                <button
                  onClick={() => setShowWatcherPicker(v => !v)}
                  className="flex items-center gap-1 text-xs text-zinc-900 hover:text-zinc-900 px-2 py-1 rounded-lg hover:bg-zinc-100"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  ThÃªm
                </button>
              </div>

              {showWatcherPicker && (
                <div className="mb-3 border border-zinc-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                  {(allUsers as any[])
                    .filter((u: any) => !task.watchers?.some(w => w.id === u.id))
                    .map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => { addWatcher.mutate({ taskId, userId: u.id }); setShowWatcherPicker(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-zinc-100 transition-colors"
                      >
                        <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-700 shrink-0">
                          {u.fullName?.[0] ?? '?'}
                        </div>
                        <span className="text-zinc-700">{u.fullName}</span>
                      </button>
                    ))}
                  {(allUsers as any[]).filter((u: any) => !task.watchers?.some(w => w.id === u.id)).length === 0 && (
                    <p className="text-xs text-zinc-400 text-center py-3">Táº¥t cáº£ Ä‘Ã£ theo dÃµi</p>
                  )}
                </div>
              )}

              {task.watchers && task.watchers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {task.watchers.map(w => (
                    <div key={w.id} className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 rounded-full pl-1 pr-2 py-0.5">
                      <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-700">
                        {w.fullName?.[0] ?? '?'}
                      </div>
                      <span className="text-xs text-zinc-700">{w.fullName}</span>
                      <button
                        onClick={() => removeWatcher.mutate({ taskId, userId: w.id })}
                        className="ml-0.5 text-zinc-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400">ChÆ°a cÃ³ ngÆ°á»i theo dÃµi</p>
              )}
            </div>

            {/* Timeline */}
            <div className="p-4">
              <EntityTimeline entityType="TASK" entityId={task.id} />
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

// â”€â”€â”€ DnD helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskStatusColumn({ status, children }: { status: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={`flex-shrink-0 w-72 rounded-xl p-3 transition-colors ${STATUS_COLORS[status]} ${isOver ? 'ring-2 ring-zinc-400 ring-inset' : ''}`}>
      {children}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onMove: (id: string, status: Task['status']) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onDetail: (task: Task) => void;
  dragListeners?: Record<string, any>;
}

function DraggableTaskCard(props: Omit<TaskCardProps, 'dragListeners'>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.task.id,
    data: { taskData: props.task, status: props.task.status },
  });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`${isDragging ? 'opacity-30' : ''} cursor-grab active:cursor-grabbing`}>
      <TaskCard {...props} />
    </div>
  );
}

// â”€â”€â”€ TaskCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TaskCard({
  task,
  onMove,
  onEdit,
  onDelete,
  onDetail,
}: Omit<TaskCardProps, 'dragListeners'>) {
  const statuses: Task['status'][] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

  return (
    <div className="group bg-white rounded-lg border border-zinc-200 p-3 shadow-sm hover:shadow-md transition-shadow relative">
      {/* Action buttons (hover) */}
      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900"
          title="Chá»‰nh sá»­a"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task); }}
          className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600"
          title="XÃ³a"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div
        className="cursor-pointer"
        onClick={() => onDetail(task)}
      >
        <div className="flex items-start justify-between gap-2 mb-2 pr-12">
          <p className="text-sm font-medium text-zinc-900 leading-snug hover:text-zinc-900 transition-colors">
            {task.title}
          </p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${PRIORITY_BADGE[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
        </div>

        {task.project && (
          <p className="text-xs text-zinc-900 mb-1">ðŸ“ {task.project.name}</p>
        )}

        {task.dueDate && (
          <p className="text-xs text-zinc-400 mb-2">
            ðŸ“… {new Date(task.dueDate).toLocaleDateString('vi-VN')}
          </p>
        )}

        {task.assignee && (
          <div className="flex items-center gap-1 mb-2">
            <div className="w-5 h-5 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium text-zinc-700">
              {task.assignee?.fullName?.[0] ?? '?'}
            </div>
            <span className="text-xs text-zinc-500">{task.assignee.fullName}</span>
          </div>
        )}

        {task._count && (task._count.subtasks > 0 || task._count.comments > 0) && (
          <div className="flex gap-2 text-xs text-zinc-400 mb-2">
            {task._count.subtasks > 0 && <span>â—» {task._count.subtasks} subtask</span>}
            {task._count.comments > 0 && <span>ðŸ’¬ {task._count.comments}</span>}
          </div>
        )}
      </div>

      <div className="flex gap-1 mt-2 flex-wrap">
        {statuses
          .filter((s) => s !== task.status)
          .map((s) => (
            <button
              key={s}
              onClick={(e) => { e.stopPropagation(); onMove(task.id, s); }}
              className="text-xs px-2 py-0.5 rounded border border-zinc-200 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
            >
              â†’ {STATUS_LABELS[s]}
            </button>
          ))}
      </div>
    </div>
  );
}

// â”€â”€â”€ CreateTaskModal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const createTask = useCreateTask();
  const { data: projects } = useProjects();
  const { data: allUsers } = useUsers();
  const [projectId, setProjectId] = useState('');
  const [watcherIds, setWatcherIds] = useState<string[]>([]);

  const toggleWatcher = (userId: string) => {
    setWatcherIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask.mutateAsync({
      title,
      priority: priority as any,
      projectId: projectId || undefined,
      watcherIds: watcherIds.length > 0 ? watcherIds : undefined,
    } as any);
    toast.success('ÄÃ£ táº¡o nhiá»‡m vá»¥');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Táº¡o nhiá»‡m vá»¥ má»›i</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">TiÃªu Ä‘á» *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:border-transparent"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nháº­p tiÃªu Ä‘á» nhiá»‡m vá»¥..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Má»©c Ä‘á»™ Æ°u tiÃªn</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {projects && projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Dá»± Ã¡n</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- KhÃ´ng gÃ¡n dá»± Ã¡n --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {allUsers && allUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">NgÆ°á»i theo dÃµi</label>
              <div className="flex flex-wrap gap-1.5">
                {allUsers.map((u: any) => {
                  const isSelected = watcherIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleWatcher(u.id)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                        isSelected
                          ? 'bg-blue-100 border-blue-400 text-blue-700'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      {u.fullName}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createTask.isPending}
              className="flex-1 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50"
            >
              {createTask.isPending ? 'Äang táº¡o...' : 'Táº¡o nhiá»‡m vá»¥'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50">
              Há»§y
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function TasksPage() {
  const { data: columns, isLoading, refetch } = useTasksKanban();
  const moveStatus = useMoveTaskStatus();
  const deleteTask = useDeleteTask();
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragTask(event.active.data.current?.taskData ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;
    if (!over) return;
    const fromStatus = active.data.current?.status;
    const toStatus = over.id as Task['status'];
    if (fromStatus && toStatus && fromStatus !== toStatus) {
      moveStatus.mutate({ id: active.id as string, status: toStatus });
    }
  };

  const handleMove = async (id: string, status: Task['status']) => {
    await moveStatus.mutateAsync({ id, status });
  };

  const handleDelete = async (task: Task) => {
    await deleteTask.mutateAsync(task.id);
    toast.success('ÄÃ£ xÃ³a nhiá»‡m vá»¥');
    setDeleteConfirm(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full" />
      </div>
    );
  }

  const statuses: Task['status'][] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
  const allTasks = columns?.flatMap(c => c.tasks) ?? [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Nhiá»‡m vá»¥</h1>
          <p className="text-zinc-500 text-sm mt-1">Quáº£n lÃ½ nhiá»‡m vá»¥ theo {viewMode === 'kanban' ? 'báº£ng Kanban' : 'danh sÃ¡ch'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('kanban')} className={`px-2.5 py-2 ${viewMode === 'kanban' ? 'bg-zinc-900/10 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="Kanban">
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-2 border-l border-zinc-200 ${viewMode === 'list' ? 'bg-zinc-900/10 text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`} title="Danh sÃ¡ch">
              <List size={15} />
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700"
          >
            + Táº¡o nhiá»‡m vá»¥
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
      <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {statuses.map((status) => {
          const col = columns?.find((c) => c.status === status);
          const tasks = col?.tasks ?? [];

          return (
            <TaskStatusColumn key={status} status={status}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">{STATUS_LABELS[status]}</h3>
                <span className="bg-white text-zinc-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  {tasks.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[100px]">
                {tasks.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    onMove={handleMove}
                    onEdit={setEditTask}
                    onDelete={setDeleteConfirm}
                    onDetail={(t) => setDetailTaskId(t.id)}
                  />
                ))}
                {tasks.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-zinc-300">
                    <CheckSquare size={28} className="mb-2" />
                    <p className="text-xs text-zinc-400">ChÆ°a cÃ³ nhiá»‡m vá»¥</p>
                  </div>
                )}
              </div>
            </TaskStatusColumn>
          );
        })}
      </div>
      <DragOverlay>
        {activeDragTask ? (
          <div className="bg-white border border-zinc-400 rounded-lg p-3 shadow-lg opacity-90 w-72">
            <p className="text-sm font-medium text-zinc-900">{activeDragTask.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[activeDragTask.priority]}`}>
              {PRIORITY_LABELS[activeDragTask.priority]}
            </span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>
      </>
      ) : (
      /* â”€â”€â”€ List View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Nhiá»‡m vá»¥</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Tráº¡ng thÃ¡i</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Æ¯u tiÃªn</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">NgÆ°á»i thá»±c hiá»‡n</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Dá»± Ã¡n</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide">Háº¡n chÃ³t</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allTasks.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-zinc-400 text-sm">ChÆ°a cÃ³ nhiá»‡m vá»¥ nÃ o</td></tr>
            )}
            {allTasks.map((task) => (
              <tr key={task.id} onClick={() => setDetailTaskId(task.id)}
                className="hover:bg-zinc-50/50 cursor-pointer transition-colors">
                <td className="px-4 py-3 font-medium text-zinc-900">{task.title}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    task.status === 'DONE' ? 'bg-green-100 text-green-700' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    task.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-zinc-100 text-zinc-600'
                  }`}>{STATUS_LABELS[task.status]}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[task.priority]}`}>
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{task.assignee?.fullName ?? '-'}</td>
                <td className="px-4 py-3 text-zinc-900 text-xs">{task.project?.name ?? '-'}</td>
                <td className="px-4 py-3 text-zinc-500 text-xs">{task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={e => { e.stopPropagation(); setEditTask(task); }} className="p-1 text-zinc-400 hover:text-zinc-900"><Pencil size={13} /></button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConfirm(task); }} className="p-1 text-zinc-400 hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={() => refetch()} />
      )}

      {/* Edit modal */}
      {editTask && (
        <TaskEditModal task={editTask} onClose={() => setEditTask(null)} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold mb-2">XÃ³a nhiá»‡m vá»¥?</h2>
            <p className="text-sm text-zinc-600 mb-4">
              Báº¡n cÃ³ cháº¯c muá»‘n xÃ³a <strong>{deleteConfirm.title}</strong>? HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteTask.isPending}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleteTask.isPending ? 'Äang xÃ³a...' : 'XÃ³a'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-zinc-300 rounded-lg py-2 text-sm font-medium hover:bg-zinc-50"
              >
                Há»§y
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail slide-over */}
      {detailTaskId && (
        <TaskDetailSlideOver taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
      )}
    </div>
  );
}




