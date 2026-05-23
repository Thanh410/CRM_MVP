'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Eye, FileText, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { RippleButton } from '@/components/ui/ripple-button';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';

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
const STATUS_TONES: Record<string, StatusTone> = {
  DRAFT: 'muted',
  ACTIVE: 'emerald',
  PAUSED: 'amber',
  COMPLETED: 'indigo',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp', ACTIVE: 'Đang chạy', PAUSED: 'Tạm dừng', COMPLETED: 'Hoàn thành',
};

// ─── Campaign Summary Modal ────────────────────────────────────────────────────
const LOG_STATUS_LABELS: Record<string, string> = {
  SENT: 'Đã gửi', DELIVERED: 'Đã nhận', OPENED: 'Đã mở', CLICKED: 'Đã click',
  BOUNCED: 'Bị lỗi', UNSUBSCRIBED: 'Hủy đăng ký', FAILED: 'Thất bại',
};
const LOG_STATUS_TONES: Record<string, StatusTone> = {
  SENT: 'indigo',
  DELIVERED: 'cyan',
  OPENED: 'emerald',
  CLICKED: 'violet',
  BOUNCED: 'amber',
  UNSUBSCRIBED: 'muted',
  FAILED: 'rose',
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
      <div className="bg-card text-card-foreground rounded-2xl shadow-lift border border-border w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-aurora-soft/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-aurora grid place-items-center shadow-pop">
              <BarChart3 size={16} className="text-white" />
            </div>
            <h2 className="font-display text-base font-bold">Chi tiết chiến dịch</h2>
          </div>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-aurora-violet border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <div className="px-6 py-5 space-y-5">
            <p className="text-sm font-medium text-foreground">{campaignName}</p>

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl p-3 text-center bg-aurora-indigo/10">
                <p className="font-display text-2xl font-bold text-aurora-indigo">{data.sentCount.toLocaleString('vi-VN')}</p>
                <p className="text-xs text-aurora-indigo/80 mt-0.5">Đã gửi</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-aurora-mint/10">
                <p className="font-display text-2xl font-bold text-emerald-600">{data.openCount.toLocaleString('vi-VN')}</p>
                <p className="text-xs text-emerald-600/80 mt-0.5">Đã mở</p>
              </div>
              <div className="rounded-xl p-3 text-center bg-aurora-violet/10">
                <p className="font-display text-2xl font-bold text-aurora-violet">{openRate}%</p>
                <p className="text-xs text-aurora-violet/80 mt-0.5">Tỷ lệ mở</p>
              </div>
            </div>

            {/* Log breakdown */}
            {data.logs && Object.keys(data.logs).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chi tiết log</p>
                <div className="space-y-2">
                  {Object.entries(data.logs as Record<string, number>).map(([status, count]) => {
                    const pct = data.sentCount > 0 ? Math.round((count / data.sentCount) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <div className="w-32 shrink-0">
                          <StatusPill tone={LOG_STATUS_TONES[status] ?? 'muted'}>
                            {LOG_STATUS_LABELS[status] ?? status}
                          </StatusPill>
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div className="bg-aurora h-1.5 rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-foreground font-semibold w-20 text-right shrink-0">
                          {count.toLocaleString('vi-VN')} ({pct}%)
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
    <div className="group bg-card border border-border rounded-2xl shadow-soft card-glow p-5 relative">
      {/* Edit/Delete (hover) */}
      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
        <button onClick={() => onEdit(campaign)} className="p-1.5 text-muted-foreground hover:text-aurora-violet hover:bg-aurora-violet/10 rounded-md transition" title="Chỉnh sửa">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(campaign)} className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition" title="Xóa">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-start justify-between mb-3 pr-16">
        <div>
          <h3 className="font-display font-bold text-foreground">{campaign.name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{CHANNEL_LABELS[campaign.channel]}</p>
          {campaign.template && <p className="text-xs text-muted-foreground mt-0.5">Template: {campaign.template.name}</p>}
        </div>
        <StatusPill tone={STATUS_TONES[campaign.status] ?? 'muted'}>
          {STATUS_LABELS[campaign.status]}
        </StatusPill>
      </div>
      {campaign.startDate && (
        <p className="text-xs text-muted-foreground mb-3">📅 {formatDate(campaign.startDate)}</p>
      )}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-aurora-indigo/10 rounded-lg">
          <p className="font-display text-lg font-bold text-aurora-indigo">{campaign.sentCount.toLocaleString('vi-VN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Đã gửi</p>
        </div>
        <div className="text-center p-2 bg-aurora-mint/10 rounded-lg">
          <p className="font-display text-lg font-bold text-emerald-600">{campaign.openCount.toLocaleString('vi-VN')}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Đã mở</p>
        </div>
        <div className="text-center p-2 bg-aurora-violet/10 rounded-lg">
          <p className="font-display text-lg font-bold text-aurora-violet">{openRate}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Tỷ lệ mở</p>
        </div>
      </div>
      <div className="flex gap-2">
        {campaign.status === 'DRAFT' && (
          <RippleButton variant="aurora" size="sm" className="flex-1" onClick={() => launch.mutate()} disabled={launch.isPending}>
            ▶ Kích hoạt
          </RippleButton>
        )}
        {campaign.status === 'ACTIVE' && (
          <RippleButton size="sm" className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => pause.mutate()} disabled={pause.isPending}>
            ⏸ Tạm dừng
          </RippleButton>
        )}
        <RippleButton variant="outline" size="sm" onClick={() => onViewSummary(campaign)}>
          <BarChart3 size={13} />Chi tiết
        </RippleButton>
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

  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition';

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-card text-card-foreground rounded-2xl shadow-lift border border-border w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Chỉnh sửa chiến dịch</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); update.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Tên chiến dịch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Kênh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Ngày bắt đầu</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Template</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chọn template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-3 border-t border-border">
            <RippleButton type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</RippleButton>
            <RippleButton type="submit" variant="aurora" className="flex-1" disabled={update.isPending}>
              {update.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </RippleButton>
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

  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-card text-card-foreground rounded-2xl shadow-lift border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold">Tạo chiến dịch mới</h2>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-muted"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Tên chiến dịch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Email chào mừng tháng 3..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Kênh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Ngày bắt đầu</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">Template (tuỳ chọn)</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chọn template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Audience Filter */}
          <div className="border border-border rounded-xl p-4 space-y-3 bg-aurora-soft/20">
            <p className="text-xs font-semibold text-foreground/80">Đối tượng nhận</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Trạng thái lead</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => toggleStatus(s)}
                    className={`chip-switch px-2.5 py-1 rounded-full text-xs font-semibold transition ${audienceStatuses.includes(s) ? 'btn-aurora text-white shadow-pop' : 'bg-card text-foreground/80 border border-border hover:border-aurora-violet/40'}`}>
                    {LEAD_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Tags</p>
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
              <RippleButton type="button" variant="outline" size="sm" onClick={handlePreview} disabled={previewing}>
                {previewing ? 'Đang tính...' : '👁 Xem trước đối tượng'}
              </RippleButton>
              {previewCount !== null && (
                <span className="text-xs text-foreground/80 font-medium">
                  ~<span className="text-aurora-violet font-display font-bold">{previewCount}</span> người sẽ nhận
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-border">
            <RippleButton type="button" variant="outline" className="flex-1" onClick={onClose}>Hủy</RippleButton>
            <RippleButton type="submit" variant="aurora" className="flex-1" disabled={create.isPending}>
              {create.isPending ? 'Đang tạo...' : 'Tạo chiến dịch'}
            </RippleButton>
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

  const inputCls = 'w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition';

  return (
    <>
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className="bg-card text-card-foreground rounded-2xl shadow-lift border border-border w-full max-w-2xl my-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-base font-semibold">{isEdit ? 'Chỉnh sửa template' : 'Tạo template mới'}</h2>
            <div className="flex items-center gap-2">
              {form.htmlBody && (
                <button onClick={() => setPreviewing(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-foreground border border-indigo-200 rounded-lg hover:bg-aurora-soft/30">
                  <Eye size={13} />Xem trước
                </button>
              )}
              <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground/80 rounded-lg hover:bg-muted"><X size={16} /></button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Tên template *</label>
                <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="Email chào mừng" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1">Tiêu đề email (Subject)</label>
                <input className={inputCls} value={form.subject} onChange={set('subject')} placeholder="Chào mừng bạn đến với..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Nội dung HTML</label>
              <textarea
                className={`${inputCls} font-mono text-xs resize-y`} rows={10}
                value={form.htmlBody} onChange={set('htmlBody')}
                placeholder="<html><body>...</body></html>"
              />
              <p className="text-xs text-muted-foreground mt-1">{form.htmlBody.length} ký tự</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">Nội dung văn bản thuần (tuỳ chọn)</label>
              <textarea className={`${inputCls} resize-y`} rows={3} value={form.textBody} onChange={set('textBody')} placeholder="Phiên bản plain text..." />
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <RippleButton type="button" variant="outline" onClick={onClose}>Hủy</RippleButton>
              <RippleButton type="submit" variant="aurora" disabled={isPending}>
                {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo template'}
              </RippleButton>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {previewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <p className="text-sm font-semibold text-foreground">Xem trước HTML</p>
              <button onClick={() => setPreviewing(false)} className="p-1 text-muted-foreground hover:text-foreground/80 rounded hover:bg-muted"><X size={16} /></button>
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
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{templates.length}</span> templates
        </p>
        <RippleButton variant="aurora" onClick={() => { setEditingTemplate(null); setModalOpen(true); }}>
          <Plus size={15} />Tạo template
        </RippleButton>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-card border border-border rounded-2xl h-36 animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl shadow-soft flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-aurora-soft grid place-items-center mb-3">
            <FileText size={28} className="text-aurora-violet" />
          </div>
          <p className="text-sm">Chưa có template nào</p>
          <RippleButton variant="aurora" size="sm" onClick={() => setModalOpen(true)} className="mt-3">
            Tạo template đầu tiên
          </RippleButton>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-card border border-border rounded-2xl shadow-soft card-glow p-5 group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-aurora-violet/10 grid place-items-center shrink-0">
                      <FileText size={13} className="text-aurora-violet" />
                    </div>
                    <h3 className="font-display text-sm font-bold text-foreground truncate">{t.name}</h3>
                  </div>
                  {t.subject && <p className="text-xs text-muted-foreground mt-1 truncate">"{t.subject}"</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-muted-foreground hover:text-aurora-violet hover:bg-aurora-violet/10 rounded-md transition"><Pencil size={13} /></button>
                  <button onClick={() => window.confirm(`Xóa template "${t.name}"?`) && deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition disabled:opacity-50"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
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

  if (isLoading) return <div className="flex items-center justify-center h-48"><div className="animate-spin w-7 h-7 border-4 border-aurora-violet border-t-transparent rounded-full" /></div>;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="card-glow bg-card border border-border rounded-2xl shadow-soft p-4 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-aurora-violet/10 blur-2xl" />
          <p className="font-display text-2xl font-bold text-aurora-violet relative">{stats.total}</p>
          <p className="text-sm text-muted-foreground relative">Tổng chiến dịch</p>
        </div>
        <div className="card-glow bg-card border border-border rounded-2xl shadow-soft p-4 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-aurora-mint/10 blur-2xl" />
          <p className="font-display text-2xl font-bold text-emerald-600 relative">{stats.active}</p>
          <p className="text-sm text-muted-foreground relative">Đang chạy</p>
        </div>
        <div className="card-glow bg-card border border-border rounded-2xl shadow-soft p-4 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-aurora-cyan/10 blur-2xl" />
          <p className="font-display text-2xl font-bold text-aurora-cyan relative">{stats.totalSent.toLocaleString('vi-VN')}</p>
          <p className="text-sm text-muted-foreground relative">Tổng đã gửi</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`chip-switch px-3 h-8 rounded-full text-xs font-semibold transition ${statusFilter === s ? 'btn-aurora text-white shadow-pop' : 'bg-card border border-border text-foreground/80 hover:border-aurora-violet/40'}`}>
              {s ? STATUS_LABELS[s] : 'Tất cả'}
            </button>
          ))}
        </div>
        <RippleButton variant="aurora" onClick={() => setShowCreate(true)} className="shrink-0">
          <Plus size={15} />Tạo chiến dịch
        </RippleButton>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl shadow-soft text-center py-16">
          <div className="w-14 h-14 rounded-2xl bg-aurora-soft grid place-items-center mx-auto mb-3 text-2xl">📣</div>
          <p className="font-display font-bold text-foreground">Chưa có chiến dịch nào</p>
          <p className="text-sm text-muted-foreground mt-1">Tạo chiến dịch đầu tiên để gửi marketing đa kênh</p>
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
          <h1 className="font-display text-2xl font-bold tracking-tight">Marketing đa kênh</h1>
          <p className="text-muted-foreground text-sm mt-1">Email · SMS · Zalo · Messenger · Nội bộ — chiến dịch &amp; templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-5">
        <nav className="flex gap-1">
          {([['campaigns', '📣 Chiến dịch'], ['templates', '📄 Templates']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${tab === k ? 'border-aurora-violet text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'campaigns' ? <CampaignsTab /> : <TemplatesTab />}
    </div>
  );
}
