'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee?: { id: string; fullName: string; avatar?: string };
  project?: { id: string; name: string };
  dueDate?: string;
  isBlocked?: boolean;
  _count?: { subtasks: number; comments: number };
}

export interface KanbanColumn {
  status: Task['status'];
  tasks: Task[];
  count: number;
}

export function useTasksKanban(projectId?: string) {
  return useQuery<KanbanColumn[]>({
    queryKey: ['tasks', 'kanban', projectId],
    queryFn: async () => {
      const params = projectId ? `?projectId=${projectId}` : '';
      const res = await api.get(`/tasks/kanban${params}`);
      return res.data;
    },
  });
}

export function useTasks(filters?: {
  mine?: boolean;
  watched?: boolean;
  overdue?: boolean;
  pending?: boolean;
  blocked?: boolean;
  projectId?: string;
  status?: string;
}) {
  return useQuery<Task[]>({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.mine) params.set('mine', 'true');
      if (filters?.projectId) params.set('projectId', filters.projectId);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.watched) params.set('watched', 'true');
      if (filters?.overdue) params.set('overdue', 'true');
      if (filters?.pending) params.set('pending', 'true');
      if (filters?.blocked) params.set('blocked', 'true');
      const res = await api.get(`/tasks?${params}`);
      return res.data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Task> & { title: string }) => api.post('/tasks', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMoveTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      api.patch(`/tasks/${id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export interface TaskComment {
  id: string;
  content: string;
  author?: { id: string; fullName: string };
  createdAt: string;
}

export interface TaskWatcher {
  id: string;
  fullName: string;
  avatar?: string;
}

export interface TaskDetail extends Task {
  comments?: TaskComment[];
  watchers?: TaskWatcher[];
}

export function useTask(id: string) {
  return useQuery<TaskDetail>({
    queryKey: ['tasks', id],
    queryFn: async () => {
      const res = await api.get(`/tasks/${id}`);
      const task = res.data;
      // API returns watchers as { id, user: { id, fullName, avatar } }
      // Normalize to flat { id, fullName, avatar } the UI expects
      if (task.watchers) {
        task.watchers = task.watchers.map((w: any) => ({
          id: w.user?.id ?? w.userId ?? w.id,
          fullName: w.user?.fullName ?? w.fullName,
          avatar: w.user?.avatar ?? w.avatar,
        }));
      }
      return task;
    },
    enabled: !!id,
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) =>
      api.patch(`/tasks/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useAddTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.post(`/tasks/${id}/comments`, { content }).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['tasks', id] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAddWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      api.post(`/tasks/${taskId}/watchers/${userId}`).then((r) => r.data),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['tasks', taskId] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRemoveWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, userId }: { taskId: string; userId: string }) =>
      api.delete(`/tasks/${taskId}/watchers/${userId}`).then((r) => r.data),
    onSuccess: (_data, { taskId }) => qc.invalidateQueries({ queryKey: ['tasks', taskId] }),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    },
  });
}
