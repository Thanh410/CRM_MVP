'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export function useDealsKanban(pipelineId?: string) {
  return useQuery({
    queryKey: ['deals', 'kanban', pipelineId],
    queryFn: async () => {
      const { data } = await api.get('/deals/kanban', { params: { pipelineId } });
      return data;
    },
  });
}

export function useDeals(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: async () => {
      const { data } = await api.get('/deals', { params });
      return data;
    },
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => api.post('/deals', dto).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Tạo deal thành công'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi'),
  });
}

export function useMoveDealStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      api.patch(`/deals/${id}/stage`, { stageId }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deals'] }),
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi'),
  });
}

export function useMarkDealWon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/deals/${id}/won`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Deal đã thắng!'); },
  });
}

export function useMarkDealLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, lostReason }: { id: string; lostReason?: string }) =>
      api.patch(`/deals/${id}/lost`, { lostReason }).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Đã đánh dấu thua'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi'),
  });
}

export function useUpdateDeal(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => api.patch(`/deals/${id}`, dto).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Cập nhật deal thành công'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi'),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => api.get(`/deals/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Đã xóa deal'); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Xóa thất bại'),
  });
}

export function usePipelines() {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/deals/pipelines').then((r) => r.data),
  });
}
