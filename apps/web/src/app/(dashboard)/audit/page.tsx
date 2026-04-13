'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { api } from '@/lib/api';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
}

interface PagedResult {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-indigo-100 text-indigo-700',
  LOGOUT: 'bg-gray-100 text-gray-600',
  EXPORT: 'bg-yellow-100 text-yellow-700',
  IMPORT: 'bg-orange-100 text-orange-700',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Tạo', UPDATE: 'Cập nhật', DELETE: 'Xóa',
  LOGIN: 'Đăng nhập', LOGOUT: 'Đăng xuất',
  EXPORT: 'Xuất', IMPORT: 'Nhập',
};

const RESOURCE_LABELS: Record<string, string> = {
  lead: 'Lead', contact: 'Liên hệ', company: 'Công ty', deal: 'Cơ hội',
  user: 'Người dùng', task: 'Nhiệm vụ', project: 'Dự án',
  campaign: 'Chiến dịch', conversation: 'Hội thoại', auth: 'Xác thực',
};

// ─── Changes Viewer ─────────────────────────────────────────────────────────────
function ChangesViewer({ changes }: { changes: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(changes);
  if (keys.length === 0) return null;
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(v => !v)} className="text-xs text-indigo-600 hover:underline">
        {open ? 'Ẩn' : `Xem thay đổi (${keys.length} trường)`}
      </button>
      {open && (
        <div className="mt-1 text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 space-y-1 max-w-sm">
          {keys.map(k => (
            <div key={k} className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-24 truncate">{k}:</span>
              <span className="text-gray-700 truncate">{JSON.stringify(changes[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AuditPage() {
  const [page, setPage] = useState(1);
  const [resource, setResource] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const limit = 20;

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['audit', page, resource, userSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (resource) params.set('resource', resource);
      return api.get(`/audit?${params}`).then(r => r.data);
    },
  });

  const logs = data?.data ?? [];
  const totalPages = data?.meta?.totalPages ?? 1;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nhật ký hệ thống</h1>
            <p className="text-gray-500 text-sm mt-0.5">Theo dõi mọi thao tác trong tổ chức</p>
          </div>
        </div>
        {data && (
          <span className="text-sm text-gray-500">
            Tổng <span className="font-semibold text-gray-900">{(data.meta?.total ?? 0).toLocaleString()}</span> bản ghi
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['', ...Object.keys(RESOURCE_LABELS)] as string[]).map(r => (
            <button key={r} onClick={() => { setResource(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resource === r ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {r ? RESOURCE_LABELS[r] ?? r : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hành động</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tài nguyên</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-gray-400">
                    <Shield size={32} className="mx-auto mb-2 text-gray-300" />
                    <p>Chưa có bản ghi nào</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_BADGE[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700 font-medium">
                        {RESOURCE_LABELS[log.resource] ?? log.resource}
                      </p>
                      {log.resourceId && (
                        <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-[160px]">{log.resourceId}</p>
                      )}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <ChangesViewer changes={log.changes} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {log.user.fullName?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium">{log.user.fullName}</p>
                            <p className="text-xs text-gray-400">{log.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Hệ thống</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 font-mono">{log.ip ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-700">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Trang {page} / {totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
