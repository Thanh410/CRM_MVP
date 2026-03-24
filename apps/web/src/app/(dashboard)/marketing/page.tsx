'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Eye, FileText, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; channel: string; status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  sentCount: number; openCount: number; startDate?: string;
  template?: { id: string; name: string };
}
interface Template {
  id: string; name: string; subject?: string; htmlBody?: string; textBody?: string; createdAt: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: '📧 Email', SMS: '📱 SMS', ZALO: '🟦 Zalo', MESSENGER: '💬 Messenger', INTERNAL: '🔔 Nội bộ',
};
const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600', ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700', COMPLETED: 'bg-blue-100 text-blue-700',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp', ACTIVE: 'Đang chạy', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành',
};

// ─── Campaign Summary Modal ────────────────────────────────────────────────────
const LOG_STATUS_LABELS: Record<string, string> = {
  SENT: 'Đã gửi', DELIVERED: 'Đã nhận', OPENED: 'Đã mở', CLICKED: 'Đã click',
  BOUNCED: 'Bị lỗi', UNSUBSCRIBED: 'Hủy đăng ký', FAILED: 'Thất bại',
};
const LOG_STATUS_COLOR: Record<string, string> = {
  SENT: 'bg-blue-100 text-blue-700', DELIVERED: 'bg-cyan-100 text-cyan-700',
  OPENED: 'bg-green-100 text-green-700', CLICKED: 'bg-indigo-100 text-indigo-700',
  BOUNCED: 'bg-orange-100 text-orange-700', UNSUBSCRIBED: 'bg-gray-100 text-gray-600',
  FAILED: 'bg-red-100 text-red-700',
};

function CampaignSummaryModal({ campaignId, campaignName, onClose }: { campaignId: string; campaignName: string; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-summary', campaignId],
    queryFn: () => api.get(`/marketing/campaigns/${campaignId}/summary`).then(r => r.data),
  });

  const openRate = data?.sentCount > 0 ? Math.round((data.openCount / data.sentCount) * 100) : 0;

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Chi tiết chiến dịch</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <div className="px-6 py-5 space-y-5">
            <p className="text-sm font-medium text-gray-700">{campaignName}</p>

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{data.sentCount.toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-0.5">Đã gửi</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{data.openCount.toLocaleString()}</p>
                <p className="text-xs text-green-500 mt-0.5">Đã mở</p>
              </div>
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{openRate}%</p>
                <p className="text-xs text-indigo-500 mt-0.5">Tỷ lệ mở</p>
              </div>
            </div>

            {/* Log breakdown */}
            {data.logs && Object.keys(data.logs).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chi tiết log</p>
                <div className="space-y-2">
                  {Object.entries(data.logs as Record<string, number>).map(([status, count]) => {
                    const pct = data.sentCount > 0 ? Math.round((count / data.sentCount) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-32 text-center shrink-0 ${LOG_STATUS_COLOR[status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {LOG_STATUS_LABELS[status] ?? status}
                        </span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium w-16 text-right shrink-0">
                          {count.toLocaleString()} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onEdit, onDelete, onViewSummary }: { campaign: Campaign; onEdit: (c: Campaign) => void; onDelete: (c: Campaign) => void; onViewSummary: (c: Campaign) => void }) {
  const qc = useQueryClient();
  const launch = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${campaign.id}/launch`), onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const pause = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${campaign.id}/pause`), onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;

  return (
    <div className="group bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow relative">
      {/* Edit/Delete (hover) */}
      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
        <button onClick={() => onEdit(campaign)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Chỉnh sửa">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(campaign)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-start justify-between mb-3 pr-16">
        <div>
          <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{CHANNEL_LABELS[campaign.channel]}</p>
          {campaign.template && <p className="text-xs text-gray-400 mt-0.5">Template: {campaign.template.name}</p>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[campaign.status]}`}>
          {STATUS_LABELS[campaign.status]}
        </span>
      </div>
      {campaign.startDate && (
        <p className="text-xs text-gray-400 mb-3">📅 {formatDate(campaign.startDate)}</p>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{campaign.sentCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Đã gửi</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-gray-900">{campaign.openCount.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Đã mở</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <p className="text-lg font-bold text-indigo-600">{openRate}%</p>
          <p className="text-xs text-gray-500">Tỷ lệ mở</p>
        </div>
      </div>
      <div className="flex gap-2">
        {campaign.status === 'DRAFT' && (
          <button onClick={() => launch.mutate()} disabled={launch.isPending}
            className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
            ▶ Kích hoạt
          </button>
        )}
        {campaign.status === 'ACTIVE' && (
          <button onClick={() => pause.mutate()} disabled={pause.isPending}
            className="flex-1 bg-yellow-500 text-white text-sm py-1.5 rounded-lg hover:bg-yellow-600 disabled:opacity-50">
            ⏸ Tạm dừng
          </button>
        )}
        <button onClick={() => onViewSummary(campaign)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:border-indigo-300 hover:text-indigo-600 transition-colors">
          <BarChart3 size={13} />Chi tiết
        </button>
      </div>
    </div>
  );
}

// ─── Campaign Edit Modal ───────────────────────────────────────────────────────
function CampaignEditModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: campaign.name,
    channel: campaign.channel,
    startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
    templateId: campaign.template?.id ?? '',
  });
  const { data: templates = [] } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => api.get('/marketing/templates').then(r => r.data) });
  const overlayRef = useRef<HTMLDivElement>(null);

  const update = useMutation({
    mutationFn: (data: typeof form) => api.patch(`/marketing/campaigns/${campaign.id}`, { ...data, templateId: data.templateId || undefined }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Đã cập nhật chiến dịch'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Chỉnh sửa chiến dịch</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); update.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tên chiến dịch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kênh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày bắt đầu</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chọn template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={update.isPending} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Campaign Modal ─────────────────────────────────────────────────────
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'];
const LEAD_STATUS_LABELS: Record<string, string> = { NEW: 'Mới', CONTACTED: 'Đã liên hệ', QUALIFIED: 'Tiềm năng', UNQUALIFIED: 'Không tiềm năng' };

function CreateCampaignModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', channel: 'EMAIL', startDate: '', templateId: '' });
  const [audienceStatuses, setAudienceStatuses] = useState<string[]>([]);
  const [audienceTagIds, setAudienceTagIds] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const { data: templates = [] } = useQuery<Template[]>({ queryKey: ['templates'], queryFn: () => api.get('/marketing/templates').then(r => r.data) });
  const { data: allTags = [] } = useQuery<{ id: string; name: string; color: string | null }[]>({ queryKey: ['tags'], queryFn: () => api.get('/tags').then(r => r.data) });

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const filter: Record<string, any> = {};
      if (audienceStatuses.length) filter.statuses = audienceStatuses;
      if (audienceTagIds.length) filter.tagIds = audienceTagIds;
      const res = await api.post('/marketing/audience/preview', { filter });
      setPreviewCount(res.data?.count ?? res.data?.total ?? 0);
    } catch { toast.error('Không thể xem trước'); }
    finally { setPreviewing(false); }
  };

  const toggleStatus = (s: string) =>
    setAudienceStatuses(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const toggleTag = (id: string) =>
    setAudienceTagIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/marketing/campaigns', {
      ...data,
      templateId: data.templateId || undefined,
      audienceFilter: (audienceStatuses.length || audienceTagIds.length)
        ? { statuses: audienceStatuses.length ? audienceStatuses : undefined, tagIds: audienceTagIds.length ? audienceTagIds : undefined }
        : undefined,
    }).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Tạo chiến dịch thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Tạo thất bại'),
  });

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold">Tạo chiến dịch mới</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tên chiến dịch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Email chào mừng tháng 3..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kênh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ngày bắt đầu</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Template (tuỳ chọn)</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chọn template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Audience Filter */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/50">
            <p className="text-xs font-semibold text-gray-600">Đối tượng nhận</p>
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Trạng thái lead</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${audienceStatuses.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
                    {LEAD_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(tag => {
                    const c = tag.color || '#6366f1';
                    const active = audienceTagIds.includes(tag.id);
                    return (
                      <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                        className="px-2.5 py-1 rounded-full text-xs font-medium border transition"
                        style={active ? { backgroundColor: c, color: '#fff', borderColor: c } : { backgroundColor: c + '18', color: c, borderColor: c + '40' }}>
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={handlePreview} disabled={previewing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50">
                {previewing ? 'Đang tính...' : 'Xem trước đối tượng'}
              </button>
              {previewCount !== null && (
                <span className="text-xs text-gray-600 font-medium">
                  ~<span className="text-indigo-600 font-bold">{previewCount}</span> người sẽ nhận
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={create.isPending} className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {create.isPending ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Template Modal ────────────────────────────────────────────────────────────
function TemplateModal({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = !!template;
  const [form, setForm] = useState({ name: template?.name ?? '', subject: template?.subject ?? '', htmlBody: template?.htmlBody ?? '', textBody: template?.textBody ?? '' });
  const [previewing, setPreviewing] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const createMutation = useMutation({
    mutationFn: (payload: typeof form) => api.post('/marketing/templates', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Tạo template thành công'); onClose(); },
    onError: () => toast.error('Tạo thất bại'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/marketing/templates/${template!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Cập nhật thành công'); onClose(); },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? updateMutation.mutate(form) : createMutation.mutate(form);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <>
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold">{isEdit ? 'Chỉnh sửa template' : 'Tạo template mới'}</h2>
            <div className="flex items-center gap-2">
              {form.htmlBody && (
                <button onClick={() => setPreviewing(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                  <Eye size={13} />Xem trước
                </button>
              )}
              <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên template *</label>
                <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="Email chào mừng" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tiêu đề email (Subject)</label>
                <input className={inputCls} value={form.subject} onChange={set('subject')} placeholder="Chào mừng bạn đến với..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung HTML</label>
              <textarea
                className={`${inputCls} font-mono text-xs resize-y`} rows={10}
                value={form.htmlBody} onChange={set('htmlBody')}
                placeholder="<html><body>...</body></html>"
              />
              <p className="text-xs text-gray-400 mt-1">{form.htmlBody.length} ký tự</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nội dung văn bản thuần (tuỳ chọn)</label>
              <textarea className={`${inputCls} resize-y`} rows={3} value={form.textBody} onChange={set('textBody')} placeholder="Phiên bản plain text..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
                {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo template'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {previewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
              <p className="text-sm font-semibold text-gray-900">Xem trước HTML</p>
              <button onClick={() => setPreviewing(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100"><X size={16} /></button>
            </div>
            <iframe
              srcDoc={form.htmlBody}
              sandbox="allow-same-origin"
              className="flex-1 w-full border-0 rounded-b-xl"
              title="template-preview"
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────────
function TemplatesTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => api.get('/marketing/templates').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/templates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Đã xóa template'); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const openEdit = (t: Template) => { setEditingTemplate(t); setModalOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">{templates.length} templates</p>
        <button onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus size={15} />Tạo template
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-gray-200 rounded-xl h-36 animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-gray-400">
          <FileText size={36} className="mb-3 opacity-30" />
          <p className="text-sm">Chưa có template nào</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-indigo-600 hover:underline">Tạo template đầu tiên</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-sm transition group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-indigo-500 shrink-0" />
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{t.name}</h3>
                  </div>
                  {t.subject && <p className="text-xs text-gray-500 mt-1 truncate">"{t.subject}"</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Pencil size={13} /></button>
                  <button onClick={() => window.confirm(`Xóa template "${t.name}"?`) && deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t.htmlBody ? `${t.htmlBody.length} ký tự HTML` : 'Không có HTML'}</span>
                <span>{formatDate(t.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <TemplateModal template={editingTemplate} onClose={() => setModalOpen(false)} />}
    </div>
  );
}

// ─── Campaigns Tab ─────────────────────────────────────────────────────────────
function CampaignsTab() {
  const qc = useQueryClient();
  const { data: campaigns, isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: () => api.get('/marketing/campaigns').then(r => r.data),
  });
  const [showCreate, setShowCreate] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [summaryCampaign, setSummaryCampaign] = useState<Campaign | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/marketing/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Đã xóa chiến dịch'); },
    onError: () => toast.error('Xóa thất bại'),
  });

  const handleDelete = (campaign: Campaign) => {
    if (!window.confirm(`Xóa chiến dịch "${campaign.name}"?`)) return;
    deleteMutation.mutate(campaign.id);
  };

  const filtered = campaigns?.filter(c => !statusFilter || c.status === statusFilter) ?? [];
  const stats = {
    total: campaigns?.length ?? 0,
    active: campaigns?.filter(c => c.status === 'ACTIVE').length ?? 0,
    totalSent: campaigns?.reduce((sum, c) => sum + c.sentCount, 0) ?? 0,
  };

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-500">Tổng chiến dịch</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-sm text-gray-500">Đang chạy</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-indigo-600">{stats.totalSent.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Tổng đã gửi</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
              {s ? STATUS_LABELS[s] : 'Tất cả'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shrink-0">
          <Plus size={15} />Tạo chiến dịch
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📢</p>
          <p className="font-medium">Chưa có chiến dịch nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onEdit={setEditingCampaign}
              onDelete={handleDelete}
              onViewSummary={setSummaryCampaign}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateCampaignModal onClose={() => setShowCreate(false)} />}
      {editingCampaign && <CampaignEditModal campaign={editingCampaign} onClose={() => setEditingCampaign(null)} />}
      {summaryCampaign && <CampaignSummaryModal campaignId={summaryCampaign.id} campaignName={summaryCampaign.name} onClose={() => setSummaryCampaign(null)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MarketingPage() {
  const [tab, setTab] = useState<'campaigns' | 'templates'>('campaigns');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý chiến dịch và templates marketing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <nav className="flex gap-1">
          {([['campaigns', 'Chiến dịch'], ['templates', 'Templates']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'campaigns' ? <CampaignsTab /> : <TemplatesTab />}
    </div>
  );
}
