'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { api } from '@/lib/api';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ACTION_BADGE: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  LOGIN: 'bg-zinc-100 text-indigo-700',
  LOGOUT: 'bg-zinc-100 text-zinc-600',
  EXPORT: 'bg-yellow-100 text-yellow-700',
  IMPORT: 'bg-orange-100 text-orange-700',
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Táº¡o', UPDATE: 'Cáº­p nháº­t', DELETE: 'XÃ³a',
  LOGIN: 'ÄÄƒng nháº­p', LOGOUT: 'ÄÄƒng xuáº¥t',
  EXPORT: 'Xuáº¥t', IMPORT: 'Nháº­p',
};

const RESOURCE_LABELS: Record<string, string> = {
  lead: 'Lead', contact: 'LiÃªn há»‡', company: 'CÃ´ng ty', deal: 'CÆ¡ há»™i',
  user: 'NgÆ°á»i dÃ¹ng', task: 'Nhiá»‡m vá»¥', project: 'Dá»± Ã¡n',
  campaign: 'Chiáº¿n dá»‹ch', conversation: 'Há»™i thoáº¡i', auth: 'XÃ¡c thá»±c',
};

// â”€â”€â”€ Changes Viewer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ChangesViewer({ changes }: { changes: Record<string, any> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(changes);
  if (keys.length === 0) return null;
  return (
    <div className="mt-1">
      <button onClick={() => setOpen(v => !v)} className="text-xs text-zinc-900 hover:underline">
        {open ? 'áº¨n' : `Xem thay Ä‘á»•i (${keys.length} trÆ°á»ng)`}
      </button>
      {open && (
        <div className="mt-1 text-xs bg-zinc-50 border border-zinc-200 rounded-lg p-2 space-y-1 max-w-sm">
          {keys.map(k => (
            <div key={k} className="flex gap-2">
              <span className="text-zinc-500 shrink-0 w-24 truncate">{k}:</span>
              <span className="text-zinc-700 truncate">{JSON.stringify(changes[k])}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          <div className="w-9 h-9 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-zinc-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Nháº­t kÃ½ há»‡ thá»‘ng</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Theo dÃµi má»i thao tÃ¡c trong tá»• chá»©c</p>
          </div>
        </div>
        {data && (
          <span className="text-sm text-zinc-500">
            Tá»•ng <span className="font-semibold text-zinc-900">{(data.meta?.total ?? 0).toLocaleString()}</span> báº£n ghi
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['', ...Object.keys(RESOURCE_LABELS)] as string[]).map(r => (
            <button key={r} onClick={() => { setResource(r); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${resource === r ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300'}`}>
              {r ? RESOURCE_LABELS[r] ?? r : 'Táº¥t cáº£'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">HÃ nh Ä‘á»™ng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">TÃ i nguyÃªn</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">NgÆ°á»i dÃ¹ng</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">IP</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Thá»i gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                      Äang táº£i...
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-400">
                    <Shield size={32} className="mx-auto mb-2 text-zinc-300" />
                    <p>ChÆ°a cÃ³ báº£n ghi nÃ o</p>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_BADGE[log.action] ?? 'bg-zinc-100 text-zinc-600'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-zinc-700 font-medium">
                        {RESOURCE_LABELS[log.resource] ?? log.resource}
                      </p>
                      {log.resourceId && (
                        <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-[160px]">{log.resourceId}</p>
                      )}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <ChangesViewer changes={log.changes} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-zinc-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                            {log.user.fullName?.[0] ?? '?'}
                          </div>
                          <div>
                            <p className="text-gray-800 font-medium">{log.user.fullName}</p>
                            <p className="text-xs text-zinc-400">{log.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Há»‡ thá»‘ng</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-zinc-500 font-mono">{log.ip ?? 'â€”'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-zinc-700">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</p>
                      <p className="text-xs text-zinc-400">{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
            <p className="text-sm text-zinc-500">
              Trang {page} / {totalPages}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft size={15} />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:border-indigo-300 hover:text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

