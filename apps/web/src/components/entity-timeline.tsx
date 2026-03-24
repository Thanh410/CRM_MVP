'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import {
  StickyNote,
  Phone,
  Mail,
  Users,
  FileText,
  CheckSquare,
  Circle,
  Trash2,
  Plus,
  ChevronDown,
  Pencil,
  Check,
  X,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Note {
  id: string;
  content: string;
  entityType: string;
  entityId: string;
  author?: { id: string; fullName: string };
  createdAt: string;
  _kind: 'note';
}

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  entityType: string;
  entityId: string;
  author?: { id: string; fullName: string };
  createdAt: string;
  _kind: 'activity';
}

type TimelineItem = Note | Activity;

type ActivityType = 'CALL' | 'EMAIL' | 'MEETING' | 'NOTE' | 'TASK' | 'OTHER';

type Tab = 'all' | 'notes' | 'activities';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'CALL', label: 'Cuộc gọi' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'MEETING', label: 'Cuộc họp' },
  { value: 'NOTE', label: 'Ghi chú' },
  { value: 'TASK', label: 'Nhiệm vụ' },
  { value: 'OTHER', label: 'Khác' },
];

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  CALL: 'Cuộc gọi',
  EMAIL: 'Email',
  MEETING: 'Cuộc họp',
  NOTE: 'Ghi chú',
  TASK: 'Nhiệm vụ',
  OTHER: 'Khác',
};

const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  CALL: 'bg-blue-100 text-blue-600',
  EMAIL: 'bg-violet-100 text-violet-600',
  MEETING: 'bg-amber-100 text-amber-600',
  NOTE: 'bg-gray-100 text-gray-600',
  TASK: 'bg-green-100 text-green-600',
  OTHER: 'bg-slate-100 text-slate-600',
};

// ─── Helper: Activity Icon ────────────────────────────────────────────────────

function ActivityIcon({ type, size = 14 }: { type: ActivityType; size?: number }) {
  switch (type) {
    case 'CALL':
      return <Phone size={size} />;
    case 'EMAIL':
      return <Mail size={size} />;
    case 'MEETING':
      return <Users size={size} />;
    case 'NOTE':
      return <FileText size={size} />;
    case 'TASK':
      return <CheckSquare size={size} />;
    default:
      return <Circle size={size} />;
  }
}

// ─── Helper: Relative Time ────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;
  return `${Math.floor(diff / 31536000)} năm trước`;
}

// ─── New Note Form ────────────────────────────────────────────────────────────

function NewNoteForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notes', { content, entityType, entityId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', entityType, entityId] });
      toast.success('Đã thêm ghi chú');
      setContent('');
    },
    onError: () => toast.error('Thêm ghi chú thất bại'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-start gap-2">
      <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center shrink-0 mt-1">
        <StickyNote size={13} className="text-yellow-600" />
      </div>
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Thêm ghi chú..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as any);
          }}
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-gray-400">Ctrl+Enter để lưu nhanh</span>
          <button
            type="submit"
            disabled={!content.trim() || mutation.isPending}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            <Plus size={12} />
            {mutation.isPending ? 'Đang lưu...' : 'Thêm ghi chú'}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── New Activity Form ────────────────────────────────────────────────────────

function NewActivityForm({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ActivityType>('CALL');
  const [title, setTitle] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/activities', { type, title, entityType, entityId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] });
      toast.success('Đã ghi nhận hoạt động');
      setTitle('');
      setOpen(false);
    },
    onError: () => toast.error('Thêm hoạt động thất bại'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition px-1 py-0.5"
      >
        <Plus size={13} />
        Ghi nhận hoạt động
        <ChevronDown size={12} />
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-700">Hoạt động mới</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Hủy
        </button>
      </div>

      {/* Type */}
      <div className="flex flex-wrap gap-1.5">
        {ACTIVITY_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition border ${
              type === opt.value
                ? `${ACTIVITY_TYPE_COLORS[opt.value]} border-transparent`
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            <ActivityIcon type={opt.value} size={11} />
            {opt.label}
          </button>
        ))}
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Tiêu đề hoạt động..."
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
      />

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!title.trim() || mutation.isPending}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          <Plus size={12} />
          {mutation.isPending ? 'Đang lưu...' : 'Thêm hoạt động'}
        </button>
      </div>
    </form>
  );
}

// ─── Timeline Item ────────────────────────────────────────────────────────────

function NoteItem({ note, onDelete }: { note: Note; onDelete: () => void }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const updateMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data } = await api.patch(`/notes/${note.id}`, { content });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', note.entityType, note.entityId] });
      toast.success('Đã cập nhật ghi chú');
      setEditing(false);
    },
    onError: () => toast.error('Cập nhật ghi chú thất bại'),
  });

  const handleSave = () => {
    if (!editContent.trim()) return;
    updateMutation.mutate(editContent);
  };

  const handleCancel = () => {
    setEditContent(note.content);
    setEditing(false);
  };

  return (
    <div className="group flex items-start gap-3">
      <div className="w-7 h-7 bg-yellow-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <StickyNote size={13} className="text-yellow-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-1.5">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={3}
                  autoFocus
                  className="w-full px-2 py-1.5 text-sm border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending || !editContent.trim()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Check size={11} />
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                  >
                    <X size={11} />
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                {note.content}
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              {note.author && (
                <span className="text-xs font-medium text-gray-500">{note.author.fullName}</span>
              )}
              <span className="text-xs text-gray-400">{relativeTime(note.createdAt)}</span>
              <span className="text-xs bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full border border-yellow-100">
                Ghi chú
              </span>
            </div>
          </div>
          {!editing && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => setEditing(true)}
                title="Chỉnh sửa ghi chú"
                className="p-1 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={onDelete}
                title="Xóa ghi chú"
                className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity, onDelete }: { activity: Activity; onDelete: () => void }) {
  const colorClass = ACTIVITY_TYPE_COLORS[activity.type] ?? 'bg-gray-100 text-gray-600';
  return (
    <div className="group flex items-start gap-3">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${colorClass}`}>
        <ActivityIcon type={activity.type} size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{activity.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {activity.author && (
                <span className="text-xs font-medium text-gray-500">{activity.author.fullName}</span>
              )}
              <span className="text-xs text-gray-400">{relativeTime(activity.createdAt)}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full border border-transparent ${colorClass} opacity-80`}>
                {ACTIVITY_TYPE_LABELS[activity.type]}
              </span>
            </div>
          </div>
          <button
            onClick={onDelete}
            title="Xóa hoạt động"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg shrink-0"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export interface EntityTimelineProps {
  entityType: string;
  entityId: string;
}

export function EntityTimeline({ entityType, entityId }: EntityTimelineProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('all');

  // Fetch notes
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get('/notes', { params: { entityType, entityId } });
      return data;
    },
    enabled: !!entityId,
  });

  // Fetch activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: async () => {
      const { data } = await api.get('/activities', { params: { entityType, entityId } });
      return data;
    },
    enabled: !!entityId,
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', entityType, entityId] });
      toast.success('Đã xóa ghi chú');
    },
    onError: () => toast.error('Xóa ghi chú thất bại'),
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities', entityType, entityId] });
      toast.success('Đã xóa hoạt động');
    },
    onError: () => toast.error('Xóa hoạt động thất bại'),
  });

  const rawNotes: Omit<Note, '_kind'>[] = Array.isArray(notesData)
    ? notesData
    : notesData?.data ?? [];
  const rawActivities: Omit<Activity, '_kind'>[] = Array.isArray(activitiesData)
    ? activitiesData
    : activitiesData?.data ?? [];

  const notes: Note[] = rawNotes.map((n) => ({ ...n, _kind: 'note' as const }));
  const activities: Activity[] = rawActivities.map((a) => ({ ...a, _kind: 'activity' as const }));

  // Merge & sort all items descending by createdAt
  const allItems: TimelineItem[] = [...notes, ...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const visibleItems =
    tab === 'all'
      ? allItems
      : tab === 'notes'
      ? notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const isLoading = notesLoading || activitiesLoading;

  const TAB_LABELS: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: allItems.length },
    { key: 'notes', label: 'Ghi chú', count: notes.length },
    { key: 'activities', label: 'Hoạt động', count: activities.length },
  ];

  return (
    <div className="space-y-4">
      {/* Input forms */}
      <div className="space-y-3">
        <NewNoteForm entityType={entityType} entityId={entityId} />
        <NewActivityForm entityType={entityType} entityId={entityId} />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
        {TAB_LABELS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition ${
              tab === key
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                tab === key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Timeline list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          Đang tải...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
          Chưa có {tab === 'notes' ? 'ghi chú' : tab === 'activities' ? 'hoạt động' : 'dữ liệu'} nào.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) =>
            item._kind === 'note' ? (
              <NoteItem
                key={`note-${item.id}`}
                note={item}
                onDelete={() => {
                  if (window.confirm('Xóa ghi chú này?')) {
                    deleteNoteMutation.mutate(item.id);
                  }
                }}
              />
            ) : (
              <ActivityItem
                key={`activity-${item.id}`}
                activity={item}
                onDelete={() => {
                  if (window.confirm('Xóa hoạt động này?')) {
                    deleteActivityMutation.mutate(item.id);
                  }
                }}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

export default EntityTimeline;
