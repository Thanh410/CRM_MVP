'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLeads, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, SOURCE_LABELS, useDeleteLead, useConvertLead, useAssignLead, useImportLeads, useCreateLead } from '@/hooks/use-leads';
import { formatDate, getInitials } from '@/lib/utils';
import { Plus, Download, Upload, Search, RefreshCw, UserCheck, X, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { EntityTimeline } from '@/components/entity-timeline';
import { TagSelector } from '@/components/tag-selector';
import { useQuery } from '@tanstack/react-query';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED', 'CONVERTED'];
const SOURCES = ['facebook', 'zalo', 'website', 'referral', 'cold_call'];

// ─── CreateLeadModal ────────────────────────────────────────────────────────
function CreateLeadModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const createLead = useCreateLead();
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    status: 'NEW', source: '', notes: '',
  });
  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    createLead.mutate(
      { ...form, email: form.email || undefined, phone: form.phone || undefined, source: form.source || undefined, notes: form.notes || undefined },
      { onSuccess: onClose },
    );
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Thêm lead mới</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Họ tên *</label>
            <input className={inputCls} value={form.fullName} onChange={set('fullName')} placeholder="Nguyễn Văn A" required autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="email@..." />
            </div>
            <div>
              <label className={labelCls}>Số điện thoại</label>
              <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="0901234567" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Trạng thái</label>
              <select className={inputCls} value={form.status} onChange={set('status')}>
                {STATUSES.filter(s => s !== 'CONVERTED').map(s => (
                  <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Nguồn</label>
              <select className={inputCls} value={form.source} onChange={set('source')}>
                <option value="">-- Chọn nguồn --</option>
                {SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] ?? s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.notes} onChange={set('notes')} placeholder="Ghi chú thêm..." />
          </div>
          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={createLead.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {createLead.isPending ? 'Đang lưu...' : 'Tạo lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function useUsers() {
  return useQuery({
    queryKey: ['users', 'select'],
    queryFn: async () => {
      const res = await api.get('/users?limit=50');
      return res.data?.data ?? res.data ?? [];
    },
  });
}

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setSearch(q); setPage(1); }
  }, [searchParams]);

  const { data, isLoading, refetch } = useLeads({ search: search || undefined, status: status || undefined, page, limit: 20 });
  const deleteLead = useDeleteLead();
  const convertLead = useConvertLead();
  const assignLead = useAssignLead();
  const importLeads = useImportLeads();
  const { data: users } = useUsers();

  const handleExport = async () => {
    try {
      const res = await api.get('/leads/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
    } catch { toast.error('Export thất bại'); }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Xoá lead này?')) return;
    deleteLead.mutate(id, {
      onSuccess: () => { if (selectedLead?.id === id) setSelectedLead(null); },
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importLeads.mutate(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Khách hàng tiềm năng</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta?.total ?? 0} leads</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importLeads.isPending}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Upload size={14} /> {importLeads.isPending ? 'Đang nhập...' : 'Nhập CSV'}
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <Plus size={14} /> Thêm lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm tên, email, số điện thoại..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button onClick={() => refetch()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        {/* Table */}
        <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all ${selectedLead ? 'flex-1 min-w-0' : 'w-full'}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Đang tải...</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Họ tên</th>
                    {!selectedLead && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Liên hệ</th>}
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Trạng thái</th>
                    {!selectedLead && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Nguồn</th>}
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phụ trách</th>
                    {!selectedLead && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ngày tạo</th>}
                    <th className="px-4 py-3 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.data?.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                        Chưa có lead nào. Nhấn "Thêm lead" để bắt đầu.
                      </td>
                    </tr>
                  )}
                  {data?.data?.map((lead: any) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                      className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedLead?.id === lead.id ? 'bg-indigo-50/50 border-l-2 border-l-indigo-500' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-indigo-700">{getInitials(lead.fullName)}</span>
                          </div>
                          <span className="font-medium text-gray-900 text-sm">{lead.fullName}</span>
                        </div>
                      </td>
                      {!selectedLead && (
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          <div>{lead.email}</div>
                          <div>{lead.phone}</div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[lead.status]}`}>
                          {LEAD_STATUS_LABELS[lead.status]}
                        </span>
                      </td>
                      {!selectedLead && (
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {SOURCE_LABELS[lead.source ?? ''] ?? lead.source ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {lead.assignee?.fullName ?? <span className="text-gray-300">—</span>}
                      </td>
                      {!selectedLead && (
                        <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(lead.createdAt)}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5">
                          {lead.status !== 'CONVERTED' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); convertLead.mutate(lead.id); }}
                              title="Chuyển thành Contact"
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                            >
                              <UserCheck size={13} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(e, lead.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data?.meta && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    {((page - 1) * 20) + 1}–{Math.min(page * 20, data.meta.total)} / {data.meta.total}
                  </span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">
                      Trước
                    </button>
                    <span className="px-3 py-1.5 text-xs text-gray-600">{page} / {data.meta.totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))} disabled={page >= data.meta.totalPages}
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition">
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <div className="w-96 shrink-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-indigo-700">{getInitials(selectedLead.fullName)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedLead.fullName}</p>
                  <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-medium ${LEAD_STATUS_COLORS[selectedLead.status]}`}>
                    {LEAD_STATUS_LABELS[selectedLead.status]}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X size={16} />
              </button>
            </div>

            {/* Contact Info */}
            <div className="px-4 py-3 border-b border-gray-100 space-y-1.5 text-xs text-gray-500">
              {selectedLead.email && <div>📧 {selectedLead.email}</div>}
              {selectedLead.phone && <div>📞 {selectedLead.phone}</div>}
              {selectedLead.source && <div>🔗 Nguồn: {SOURCE_LABELS[selectedLead.source] ?? selectedLead.source}</div>}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-gray-400">👤 Phụ trách:</span>
                <select
                  className="flex-1 border rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500 bg-white"
                  value={selectedLead.assignee?.id ?? ''}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    assignLead.mutate(
                      { id: selectedLead.id, userId: e.target.value },
                      {
                        onSuccess: (updated) => {
                          setSelectedLead((prev: any) => ({ ...prev, assignee: updated?.assignee ?? prev.assignee }));
                        },
                      }
                    );
                  }}
                >
                  <option value="">-- Chưa gán --</option>
                  {(users ?? []).map((u: any) => (
                    <option key={u.id} value={u.id}>{u.fullName}</option>
                  ))}
                </select>
              </div>
              <div className="pt-1">
                <TagSelector entityType="LEAD" entityId={selectedLead.id} />
              </div>
            </div>

            {/* Timeline */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              <EntityTimeline entityType="LEAD" entityId={selectedLead.id} />
            </div>
          </div>
        )}
      </div>

      {createOpen && <CreateLeadModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
