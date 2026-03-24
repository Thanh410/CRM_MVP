'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'Mới',
  CONTACTED: 'Đã liên hệ',
  QUALIFIED: 'Tiềm năng',
  UNQUALIFIED: 'Không tiềm năng',
  CONVERTED: 'Đã chuyển đổi',
};

export const LEAD_STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-yellow-100 text-yellow-700',
  QUALIFIED: 'bg-green-100 text-green-700',
  UNQUALIFIED: 'bg-gray-100 text-gray-500',
  CONVERTED: 'bg-purple-100 text-purple-700',
};

export const SOURCE_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  zalo: 'Zalo',
  website: 'Website',
  referral: 'Giới thiệu',
  cold_call: 'Cold Call',
};

export function useLeads(params?: Record<string, any>) {
  return useQuery({
    queryKey: ['leads', params],
    queryFn: async () => {
      const { data } = await api.get('/leads', { params });
      return data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data } = await api.get(`/leads/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => api.post('/leads', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Tạo lead thành công');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi khi tạo lead'),
  });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: any) => api.patch(`/leads/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Cập nhật thành công');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi'),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Đã xóa lead');
    },
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/leads/${id}/convert`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Đã chuyển đổi thành contact');
    },
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      api.patch(`/leads/${id}/assign`, { userId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Đã gán phụ trách');
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Lỗi gán phụ trách'),
  });
}

export function useImportLeads() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/leads/import/csv', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      toast.success(`Đã nhập ${data?.imported ?? 0} leads`);
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Import thất bại'),
  });
}
