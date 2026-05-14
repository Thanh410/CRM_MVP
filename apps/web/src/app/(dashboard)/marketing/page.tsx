'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X, Eye, FileText, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface Campaign {
  id: string; name: string; channel: string; status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  sentCount: number; openCount: number; startDate?: string;
  template?: { id: string; name: string };
}
interface Template {
  id: string; name: string; subject?: string; htmlBody?: string; textBody?: string; createdAt: string;
}

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'ðŸ“§ Email', SMS: 'ðŸ“± SMS', ZALO: 'ðŸŸ¦ Zalo', MESSENGER: 'ðŸ’¬ Messenger', INTERNAL: 'ðŸ”” Ná»™i bá»™',
};
const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-600', ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700', COMPLETED: 'bg-blue-100 text-blue-700',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Báº£n nhÃ¡p', ACTIVE: 'Äang cháº¡y', PAUSED: 'Táº¡m dá»«ng', COMPLETED: 'HoÃ n thÃ nh',
};

// â”€â”€â”€ Campaign Summary Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOG_STATUS_LABELS: Record<string, string> = {
  SENT: 'ÄÃ£ gá»­i', DELIVERED: 'ÄÃ£ nháº­n', OPENED: 'ÄÃ£ má»Ÿ', CLICKED: 'ÄÃ£ click',
  BOUNCED: 'Bá»‹ lá»—i', UNSUBSCRIBED: 'Há»§y Ä‘Äƒng kÃ½', FAILED: 'Tháº¥t báº¡i',
};
const LOG_STATUS_COLOR: Record<string, string> = {
  SENT: 'bg-blue-100 text-blue-700', DELIVERED: 'bg-cyan-100 text-cyan-700',
  OPENED: 'bg-green-100 text-green-700', CLICKED: 'bg-zinc-100 text-indigo-700',
  BOUNCED: 'bg-orange-100 text-orange-700', UNSUBSCRIBED: 'bg-zinc-100 text-zinc-600',
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-zinc-900" />
            <h2 className="text-base font-semibold text-zinc-900">Chi tiáº¿t chiáº¿n dá»‹ch</h2>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : data ? (
          <div className="px-6 py-5 space-y-5">
            <p className="text-sm font-medium text-zinc-700">{campaignName}</p>

            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{data.sentCount.toLocaleString()}</p>
                <p className="text-xs text-blue-500 mt-0.5">ÄÃ£ gá»­i</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{data.openCount.toLocaleString()}</p>
                <p className="text-xs text-green-500 mt-0.5">ÄÃ£ má»Ÿ</p>
              </div>
              <div className="bg-zinc-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{openRate}%</p>
                <p className="text-xs text-indigo-500 mt-0.5">Tá»· lá»‡ má»Ÿ</p>
              </div>
            </div>

            {/* Log breakdown */}
            {data.logs && Object.keys(data.logs).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Chi tiáº¿t log</p>
                <div className="space-y-2">
                  {Object.entries(data.logs as Record<string, number>).map(([status, count]) => {
                    const pct = data.sentCount > 0 ? Math.round((count / data.sentCount) * 100) : 0;
                    return (
                      <div key={status} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-32 text-center shrink-0 ${LOG_STATUS_COLOR[status] ?? 'bg-zinc-100 text-zinc-600'}`}>
                          {LOG_STATUS_LABELS[status] ?? status}
                        </span>
                        <div className="flex-1 bg-zinc-100 rounded-full h-1.5">
                          <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
                        <span className="text-xs text-zinc-600 font-medium w-16 text-right shrink-0">
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

// â”€â”€â”€ Campaign Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CampaignCard({ campaign, onEdit, onDelete, onViewSummary }: { campaign: Campaign; onEdit: (c: Campaign) => void; onDelete: (c: Campaign) => void; onViewSummary: (c: Campaign) => void }) {
  const qc = useQueryClient();
  const launch = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${campaign.id}/launch`), onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const pause = useMutation({ mutationFn: () => api.post(`/marketing/campaigns/${campaign.id}/pause`), onSuccess: () => qc.invalidateQueries({ queryKey: ['campaigns'] }) });
  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openCount / campaign.sentCount) * 100) : 0;

  return (
    <div className="group bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md transition-shadow relative">
      {/* Edit/Delete (hover) */}
      <div className="absolute top-3 right-3 hidden group-hover:flex gap-1">
        <button onClick={() => onEdit(campaign)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg" title="Chá»‰nh sá»­a">
          <Pencil size={13} />
        </button>
        <button onClick={() => onDelete(campaign)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="XÃ³a">
          <Trash2 size={13} />
        </button>
      </div>

      <div className="flex items-start justify-between mb-3 pr-16">
        <div>
          <h3 className="font-semibold text-zinc-900">{campaign.name}</h3>
          <p className="text-sm text-zinc-500 mt-0.5">{CHANNEL_LABELS[campaign.channel]}</p>
          {campaign.template && <p className="text-xs text-zinc-400 mt-0.5">Template: {campaign.template.name}</p>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_BADGE[campaign.status]}`}>
          {STATUS_LABELS[campaign.status]}
        </span>
      </div>
      {campaign.startDate && (
        <p className="text-xs text-zinc-400 mb-3">ðŸ“… {formatDate(campaign.startDate)}</p>
      )}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-zinc-50 rounded-lg">
          <p className="text-lg font-bold text-zinc-900">{campaign.sentCount.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">ÄÃ£ gá»­i</p>
        </div>
        <div className="text-center p-2 bg-zinc-50 rounded-lg">
          <p className="text-lg font-bold text-zinc-900">{campaign.openCount.toLocaleString()}</p>
          <p className="text-xs text-zinc-500">ÄÃ£ má»Ÿ</p>
        </div>
        <div className="text-center p-2 bg-zinc-50 rounded-lg">
          <p className="text-lg font-bold text-zinc-900">{openRate}%</p>
          <p className="text-xs text-zinc-500">Tá»· lá»‡ má»Ÿ</p>
        </div>
      </div>
      <div className="flex gap-2">
        {campaign.status === 'DRAFT' && (
          <button onClick={() => launch.mutate()} disabled={launch.isPending}
            className="flex-1 bg-green-600 text-white text-sm py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
            â–¶ KÃ­ch hoáº¡t
          </button>
        )}
        {campaign.status === 'ACTIVE' && (
          <button onClick={() => pause.mutate()} disabled={pause.isPending}
            className="flex-1 bg-yellow-500 text-white text-sm py-1.5 rounded-lg hover:bg-yellow-600 disabled:opacity-50">
            â¸ Táº¡m dá»«ng
          </button>
        )}
        <button onClick={() => onViewSummary(campaign)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-zinc-200 text-zinc-600 rounded-lg hover:border-indigo-300 hover:text-zinc-900 transition-colors">
          <BarChart3 size={13} />Chi tiáº¿t
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€ Campaign Edit Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('ÄÃ£ cáº­p nháº­t chiáº¿n dá»‹ch'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Cáº­p nháº­t tháº¥t báº¡i'),
  });

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none';

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold">Chá»‰nh sá»­a chiáº¿n dá»‹ch</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); update.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">TÃªn chiáº¿n dá»‹ch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">KÃªnh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">NgÃ y báº¯t Ä‘áº§u</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Template</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chá»n template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-zinc-50">Há»§y</button>
            <button type="submit" disabled={update.isPending} className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {update.isPending ? 'Äang lÆ°u...' : 'LÆ°u thay Ä‘á»•i'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Create Campaign Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'];
const LEAD_STATUS_LABELS: Record<string, string> = { NEW: 'Má»›i', CONTACTED: 'ÄÃ£ liÃªn há»‡', QUALIFIED: 'Tiá»m nÄƒng', UNQUALIFIED: 'KhÃ´ng tiá»m nÄƒng' };

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
    } catch { toast.error('KhÃ´ng thá»ƒ xem trÆ°á»›c'); }
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Táº¡o chiáº¿n dá»‹ch thÃ nh cÃ´ng'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Táº¡o tháº¥t báº¡i'),
  });

  const inputCls = 'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-zinc-900 focus:outline-none';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
          <h2 className="text-base font-semibold">Táº¡o chiáº¿n dá»‹ch má»›i</h2>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); create.mutate(form); }} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">TÃªn chiáº¿n dá»‹ch *</label>
            <input className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Email chÃ o má»«ng thÃ¡ng 3..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">KÃªnh</label>
              <select className={inputCls} value={form.channel} onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}>
                {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">NgÃ y báº¯t Ä‘áº§u</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Template (tuá»³ chá»n)</label>
            <select className={inputCls} value={form.templateId} onChange={e => setForm(p => ({ ...p, templateId: e.target.value }))}>
              <option value="">-- Chá»n template --</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Audience Filter */}
          <div className="border border-zinc-200 rounded-xl p-4 space-y-3 bg-zinc-50/50">
            <p className="text-xs font-semibold text-zinc-600">Äá»‘i tÆ°á»£ng nháº­n</p>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Tráº¡ng thÃ¡i lead</p>
              <div className="flex flex-wrap gap-1.5">
                {LEAD_STATUSES.map(s => (
                  <button key={s} type="button" onClick={() => toggleStatus(s)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${audienceStatuses.includes(s) ? 'bg-zinc-900 text-white border-indigo-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-indigo-300'}`}>
                    {LEAD_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {allTags.length > 0 && (
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Tags</p>
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
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-900 border border-indigo-200 rounded-lg hover:bg-zinc-50 disabled:opacity-50">
                {previewing ? 'Äang tÃ­nh...' : 'Xem trÆ°á»›c Ä‘á»‘i tÆ°á»£ng'}
              </button>
              {previewCount !== null && (
                <span className="text-xs text-zinc-600 font-medium">
                  ~<span className="text-zinc-900 font-bold">{previewCount}</span> ngÆ°á»i sáº½ nháº­n
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-zinc-50">Há»§y</button>
            <button type="submit" disabled={create.isPending} className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {create.isPending ? 'Äang táº¡o...' : 'Táº¡o chiáº¿n dá»‹ch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Template Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Táº¡o template thÃ nh cÃ´ng'); onClose(); },
    onError: () => toast.error('Táº¡o tháº¥t báº¡i'),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<typeof form>) => api.patch(`/marketing/templates/${template!.id}`, payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('Cáº­p nháº­t thÃ nh cÃ´ng'); onClose(); },
    onError: () => toast.error('Cáº­p nháº­t tháº¥t báº¡i'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    isEdit ? updateMutation.mutate(form) : createMutation.mutate(form);
  };
  const isPending = createMutation.isPending || updateMutation.isPending;

  const inputCls = 'w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900';

  return (
    <>
      <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
        onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
            <h2 className="text-base font-semibold">{isEdit ? 'Chá»‰nh sá»­a template' : 'Táº¡o template má»›i'}</h2>
            <div className="flex items-center gap-2">
              {form.htmlBody && (
                <button onClick={() => setPreviewing(true)} className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-900 border border-indigo-200 rounded-lg hover:bg-zinc-50">
                  <Eye size={13} />Xem trÆ°á»›c
                </button>
              )}
              <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"><X size={16} /></button>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">TÃªn template *</label>
                <input className={inputCls} value={form.name} onChange={set('name')} required placeholder="Email chÃ o má»«ng" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">TiÃªu Ä‘á» email (Subject)</label>
                <input className={inputCls} value={form.subject} onChange={set('subject')} placeholder="ChÃ o má»«ng báº¡n Ä‘áº¿n vá»›i..." />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Ná»™i dung HTML</label>
              <textarea
                className={`${inputCls} font-mono text-xs resize-y`} rows={10}
                value={form.htmlBody} onChange={set('htmlBody')}
                placeholder="<html><body>...</body></html>"
              />
              <p className="text-xs text-zinc-400 mt-1">{form.htmlBody.length} kÃ½ tá»±</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">Ná»™i dung vÄƒn báº£n thuáº§n (tuá»³ chá»n)</label>
              <textarea className={`${inputCls} resize-y`} rows={3} value={form.textBody} onChange={set('textBody')} placeholder="PhiÃªn báº£n plain text..." />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Há»§y</button>
              <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-60">
                {isPending ? 'Äang lÆ°u...' : isEdit ? 'LÆ°u thay Ä‘á»•i' : 'Táº¡o template'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Preview Modal */}
      {previewing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 shrink-0">
              <p className="text-sm font-semibold text-zinc-900">Xem trÆ°á»›c HTML</p>
              <button onClick={() => setPreviewing(false)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded hover:bg-zinc-100"><X size={16} /></button>
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

// â”€â”€â”€ Templates Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['templates'] }); toast.success('ÄÃ£ xÃ³a template'); },
    onError: () => toast.error('XÃ³a tháº¥t báº¡i'),
  });

  const openEdit = (t: Template) => { setEditingTemplate(t); setModalOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-zinc-500">{templates.length} templates</p>
        <button onClick={() => { setEditingTemplate(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-zinc-900 text-white rounded-lg hover:bg-zinc-700">
          <Plus size={15} />Táº¡o template
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white border border-zinc-200 rounded-xl h-36 animate-pulse" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-zinc-200 flex flex-col items-center justify-center py-16 text-zinc-400">
          <FileText size={36} className="mb-3 opacity-30" />
          <p className="text-sm">ChÆ°a cÃ³ template nÃ o</p>
          <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-zinc-900 hover:underline">Táº¡o template Ä‘áº§u tiÃªn</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-zinc-200 rounded-xl p-5 hover:shadow-sm transition group">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-indigo-500 shrink-0" />
                    <h3 className="text-sm font-semibold text-zinc-900 truncate">{t.name}</h3>
                  </div>
                  {t.subject && <p className="text-xs text-zinc-500 mt-1 truncate">"{t.subject}"</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg"><Pencil size={13} /></button>
                  <button onClick={() => window.confirm(`XÃ³a template "${t.name}"?`) && deleteMutation.mutate(t.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>{t.htmlBody ? `${t.htmlBody.length} kÃ½ tá»± HTML` : 'KhÃ´ng cÃ³ HTML'}</span>
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

// â”€â”€â”€ Campaigns Tab â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('ÄÃ£ xÃ³a chiáº¿n dá»‹ch'); },
    onError: () => toast.error('XÃ³a tháº¥t báº¡i'),
  });

  const handleDelete = (campaign: Campaign) => {
    if (!window.confirm(`XÃ³a chiáº¿n dá»‹ch "${campaign.name}"?`)) return;
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
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
          <p className="text-sm text-zinc-500">Tá»•ng chiáº¿n dá»‹ch</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          <p className="text-sm text-zinc-500">Äang cháº¡y</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-2xl font-bold text-zinc-900">{stats.totalSent.toLocaleString()}</p>
          <p className="text-sm text-zinc-500">Tá»•ng Ä‘Ã£ gá»­i</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['', 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-zinc-900 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:border-indigo-300'}`}>
              {s ? STATUS_LABELS[s] : 'Táº¥t cáº£'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 shrink-0">
          <Plus size={15} />Táº¡o chiáº¿n dá»‹ch
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-4xl mb-3">ðŸ“¢</p>
          <p className="font-medium">ChÆ°a cÃ³ chiáº¿n dá»‹ch nÃ o</p>
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

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MarketingPage() {
  const [tab, setTab] = useState<'campaigns' | 'templates'>('campaigns');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Marketing</h1>
          <p className="text-zinc-500 text-sm mt-1">Quáº£n lÃ½ chiáº¿n dá»‹ch vÃ  templates marketing</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 mb-5">
        <nav className="flex gap-1">
          {([['campaigns', 'Chiáº¿n dá»‹ch'], ['templates', 'Templates']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === k ? 'border-indigo-600 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-gray-300'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'campaigns' ? <CampaignsTab /> : <TemplatesTab />}
    </div>
  );
}
