'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';

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
const ACTION_TONES: Record<string, StatusTone> = {
  CREATE: 'emerald',
  UPDATE: 'indigo',
  DELETE: 'rose',
  LOGIN: 'violet',
  LOGOUT: 'muted',
  EXPORT: 'amber',
  IMPORT: 'cyan',
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
      <button onClick={() => setOpen(v => !v)} className="text-xs text-aurora-violet hover:underline font-semibold">
        {open ? 'Ẩn' : `Xem thay đổi (${keys.length} trường)`}
      </button>
      {open && (
        <div className="mt-1 text-xs bg-muted border border-border rounded-lg p-2 space-y-1 max-w-sm">
          {keys.map(k => (
            <div key={k} className="flex gap-2">
              <span className="text-muted-foreground shrink-0 w-24 truncate">{k}:</span>
              <span className="text-foreground/80 truncate">{JSON.stringify(changes[k])}</span>
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
  const limit = 20;

  const { data, isLoading } = useQuery<PagedResult>({
    queryKey: ['audit', page, resource],
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
          <div className="w-10 h-10 rounded-xl bg-aurora flex items-center justify-center shadow-pop">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Nhật ký hệ thống</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Theo dõi mọi thao tác trong tổ chức</p>
          </div>
        </div>
        {data && (
          <span className="text-sm text-muted-foreground">
            Tổng <span className="font-semibold text-foreground">{(data.meta?.total ?? 0).toLocaleString('vi-VN')}</span> bản ghi
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['', ...Object.keys(RESOURCE_LABELS)] as string[]).map(r => (
            <button
              key={r}
              onClick={() => { setResource(r); setPage(1); }}
              className={`chip-switch px-3 h-8 rounded-full text-xs font-semibold transition ${
                resource === r
                  ? 'btn-aurora text-white shadow-pop'
                  : 'bg-card border border-border text-foreground/80 hover:border-aurora-violet/40 hover:text-foreground'
              }`}
            >
              {r ? RESOURCE_LABELS[r] ?? r : 'Tất cả'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Hành động</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Tài nguyên</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">IP</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-aurora-violet border-t-transparent rounded-full" />
                      Đang tải...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <Shield size={32} className="mx-auto mb-2 text-muted-foreground/40" />
                    <p>Chưa có bản ghi nào</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-aurora-soft/30 transition-colors">
                    <td className="px-4 py-3">
                      <StatusPill tone={ACTION_TONES[log.action] ?? 'muted'}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground font-semibold">
                        {RESOURCE_LABELS[log.resource] ?? log.resource}
                      </p>
                      {log.resourceId && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[160px]">{log.resourceId}</p>
                      )}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <ChangesViewer changes={log.changes} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <AvatarGradient id={log.user.id ?? log.user.fullName} name={log.user.fullName} size="sm" />
                          <div>
                            <p className="text-foreground font-semibold">{log.user.fullName}</p>
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Hệ thống</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground font-mono">{log.ip ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-foreground/80">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Trang <span className="font-semibold text-foreground">{page}</span> / {totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
