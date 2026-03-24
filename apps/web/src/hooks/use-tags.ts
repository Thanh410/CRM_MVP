'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export interface Tag { id: string; name: string; color: string | null; }

export function useOrgTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then(r => r.data),
    staleTime: 60_000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => api.post('/tags', data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
    onError: () => toast.error('Tạo tag thất bại'),
  });
}

export function useAddTagToEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, entityType, entityId }: { tagId: string; entityType: string; entityId: string }) =>
      api.post(`/tags/${tagId}/entities`, { entityType, entityId }).then(r => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tags', 'entity', vars.entityType, vars.entityId] });
    },
    onError: () => toast.error('Gán tag thất bại'),
  });
}

export function useRemoveTagFromEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tagId, entityType, entityId }: { tagId: string; entityType: string; entityId: string }) =>
      api.delete(`/tags/${tagId}/entities/${entityType}/${entityId}`),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['tags', 'entity', vars.entityType, vars.entityId] });
    },
    onError: () => toast.error('Xóa tag thất bại'),
  });
}

/** Tags currently applied to a specific entity */
export function useEntityTags(entityType: string, entityId: string) {
  return useQuery<Tag[]>({
    queryKey: ['tags', 'entity', entityType, entityId],
    queryFn: () => api.get(`/tags/entity/${entityType}/${entityId}`).then(r => r.data).catch(() => []),
    enabled: !!entityId,
  });
}
