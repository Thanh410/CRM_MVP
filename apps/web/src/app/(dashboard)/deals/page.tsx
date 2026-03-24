'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDealsKanban, useMoveDealStage, useMarkDealWon, useMarkDealLost, useUpdateDeal } from '@/hooks/use-deals';
import { formatCurrency, getInitials, formatDate } from '@/lib/utils';
import { Plus, Trophy, TrendingUp, X, Pencil, ThumbsDown } from 'lucide-react';
import { EntityTimeline } from '@/components/entity-timeline';
import { TagSelector } from '@/components/tag-selector';
import { api } from '@/lib/api';
import { toast } from 'sonner';

// ─── Deal Edit Modal ──────────────────────────────────────────────────────────
function DealEditModal({ deal, onClose }: { deal: any; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const updateDeal = useUpdateDeal(deal.id);

  const [form, setForm] = useState({
    title: deal.title ?? '',
    value: deal.value ? String(deal.value) : '',
    currency: deal.currency ?? 'VND',
    probability: deal.probability ?? 0,
    closeDate: deal.closeDate ? deal.closeDate.slice(0, 10) : '',
    description: deal.description ?? '',
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateDeal.mutate({ ...form, value: form.value ? Number(form.value) : undefined, probability: Number(form.probability) }, {
      onSuccess: onClose,
    });
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Chỉnh sửa deal</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Tên deal *</label>
            <input className={inputCls} value={form.title} onChange={set('title')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Giá trị</label>
              <input className={inputCls} type="number" min="0" value={form.value} onChange={set('value')} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Tiền tệ</label>
              <select className={inputCls} value={form.currency} onChange={set('currency')}>
                <option value="VND">VND</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Xác suất (%)</label>
              <input className={inputCls} type="number" min="0" max="100" value={form.probability} onChange={set('probability')} />
            </div>
            <div>
              <label className={labelCls}>Ngày chốt dự kiến</label>
              <input className={inputCls} type="date" value={form.closeDate} onChange={set('closeDate')} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Ghi chú</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description} onChange={set('description')} />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={updateDeal.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {updateDeal.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mark Lost Modal ──────────────────────────────────────────────────────────
function MarkLostModal({ dealId, dealTitle, onClose }: { dealId: string; dealTitle: string; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const markLost = useMarkDealLost();
  const [reason, setReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    markLost.mutate({ id: dealId, lostReason: reason || undefined }, { onSuccess: onClose });
  };

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Đánh dấu thua</h2>
          <p className="text-sm text-gray-500 mt-1 truncate">"{dealTitle}"</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lý do thua (tuỳ chọn)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Giá cao, chọn đối thủ, không đủ ngân sách..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={markLost.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
              {markLost.isPending ? 'Đang lưu...' : 'Xác nhận thua'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Create Deal Modal ────────────────────────────────────────────────────────
function CreateDealModal({ onClose, stages }: { onClose: () => void; stages: any[] }) {
  const qc = useQueryClient();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({ title: '', value: '', currency: 'VND', stageId: stages[0]?.id ?? '', probability: '50' });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/deals', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Tạo deal thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Tạo thất bại'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, value: form.value ? Number(form.value) : 0, probability: Number(form.probability) });
  };

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={e => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Tạo deal mới</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tên deal *</label>
            <input className={inputCls} value={form.title} onChange={set('title')} required placeholder="Hợp đồng phần mềm ABC" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Giá trị</label>
              <input className={inputCls} type="number" min="0" value={form.value} onChange={set('value')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Giai đoạn</label>
              <select className={inputCls} value={form.stageId} onChange={set('stageId')}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60">
              {mutation.isPending ? 'Đang tạo...' : 'Tạo deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const { data, isLoading } = useDealsKanban();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [lostDeal, setLostDeal] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Đang tải pipeline...</div>;
  }

  const stages = data?.stages ?? [];
  const totalValue = stages.reduce((sum: number, s: any) => sum + (s.totalValue ?? 0), 0);
  const totalDeals = stages.reduce((acc: number, s: any) => acc + (s.deals?.length ?? 0), 0);

  return (
    <div className="h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Pipeline kinh doanh</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalDeals} cơ hội · {formatCurrency(totalValue)} tổng giá trị
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
          <Plus size={14} /> Thêm deal
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map((stage: any) => (
            <div key={stage.id} className="w-64 shrink-0 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="text-sm font-medium text-gray-700">{stage.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {stage.deals?.length ?? 0}
                  </span>
                </div>
                <span className="text-xs text-gray-400">{formatCurrency(stage.totalValue ?? 0)}</span>
              </div>

              <div className="flex-1 space-y-2 min-h-[100px]">
                {stage.deals?.map((deal: any) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isSelected={selectedDeal?.id === deal.id}
                    onSelect={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                    onEdit={() => setEditingDeal(deal)}
                    onMarkLost={() => setLostDeal(deal)}
                  />
                ))}
                {stage.deals?.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-300">Chưa có deal</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {stages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Chưa có pipeline. Hãy cấu hình trong Cài đặt.
            </div>
          )}
        </div>

        {/* Deal Detail Panel */}
        {selectedDeal && (
          <div className="w-80 shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
              <div className="min-w-0 flex-1 pr-2">
                <p className="text-sm font-semibold text-gray-900 leading-snug">{selectedDeal.title}</p>
                <p className="text-sm font-bold text-indigo-600 mt-1">{formatCurrency(Number(selectedDeal.value))}</p>
                {selectedDeal.status !== 'OPEN' && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedDeal.status === 'WON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{selectedDeal.status === 'WON' ? 'Đã thắng' : 'Đã thua'}</span>
                )}
              </div>
              <button onClick={() => setSelectedDeal(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded shrink-0">
                <X size={15} />
              </button>
            </div>
            <div className="px-4 py-2 border-b border-gray-100 text-xs text-gray-500 space-y-1">
              {selectedDeal.contact && <div>👤 {selectedDeal.contact.fullName}</div>}
              {selectedDeal.company && <div>🏢 {selectedDeal.company.name}</div>}
              {selectedDeal.owner && <div>📋 Phụ trách: {selectedDeal.owner.fullName}</div>}
              <div>📊 Xác suất: {selectedDeal.probability}%</div>
              {selectedDeal.closeDate && <div>📅 Ngày chốt: {formatDate(selectedDeal.closeDate)}</div>}
              <div className="pt-1">
                <TagSelector entityType="DEAL" entityId={selectedDeal.id} />
              </div>
            </div>
            <div className="px-4 py-2 border-b border-gray-100 flex gap-2">
              <button onClick={() => setEditingDeal(selectedDeal)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
                <Pencil size={12} />Sửa
              </button>
              <button onClick={() => setLostDeal(selectedDeal)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50">
                <ThumbsDown size={12} />Thua
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <EntityTimeline entityType="DEAL" entityId={selectedDeal.id} />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {createOpen && <CreateDealModal onClose={() => setCreateOpen(false)} stages={stages} />}
      {editingDeal && <DealEditModal deal={editingDeal} onClose={() => setEditingDeal(null)} />}
      {lostDeal && <MarkLostModal dealId={lostDeal.id} dealTitle={lostDeal.title} onClose={() => setLostDeal(null)} />}
    </div>
  );
}

function DealCard({ deal, isSelected, onSelect, onEdit, onMarkLost }: {
  deal: any; isSelected: boolean; onSelect: () => void; onEdit: () => void; onMarkLost: () => void;
}) {
  const markWon = useMarkDealWon();

  const statusOverlay = deal.status !== 'OPEN' ? (
    <div className={`absolute inset-0 rounded-xl flex items-center justify-center bg-white/70 backdrop-blur-[1px]`}>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${deal.status === 'WON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {deal.status === 'WON' ? '🏆 Đã thắng' : '❌ Đã thua'}
      </span>
    </div>
  ) : null;

  return (
    <div
      onClick={onSelect}
      className={`relative bg-white border rounded-xl p-3.5 hover:shadow-sm transition-all cursor-pointer group ${
        isSelected ? 'border-indigo-400 ring-1 ring-indigo-300' : 'border-gray-200'
      }`}
    >
      {statusOverlay}
      <div className="flex items-start justify-between gap-1 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 flex-1">{deal.title}</p>
        <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition">
          <button onClick={e => { e.stopPropagation(); onEdit(); }} title="Chỉnh sửa"
            className="p-1 text-gray-300 hover:text-indigo-500 transition"><Pencil size={12} /></button>
          <button onClick={e => { e.stopPropagation(); markWon.mutate(deal.id); }} title="Đánh dấu thắng"
            className="p-1 text-gray-300 hover:text-yellow-500 transition"><Trophy size={13} /></button>
          <button onClick={e => { e.stopPropagation(); onMarkLost(); }} title="Đánh dấu thua"
            className="p-1 text-gray-300 hover:text-red-500 transition"><ThumbsDown size={12} /></button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-600">{formatCurrency(Number(deal.value))}</span>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <TrendingUp size={11} />
          {deal.probability}%
        </div>
      </div>

      {(deal.contact || deal.company) && (
        <div className="mt-2 pt-2 border-t border-gray-50 text-xs text-gray-400 truncate">
          {deal.contact?.fullName ?? deal.company?.name}
        </div>
      )}

      {deal.owner && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-semibold text-indigo-600">{deal.owner.fullName?.charAt(0)}</span>
          </div>
          <span className="text-xs text-gray-400">{deal.owner.fullName}</span>
        </div>
      )}
    </div>
  );
}
