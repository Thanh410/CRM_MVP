'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useDealsKanban, useMoveDealStage, useMarkDealWon, useMarkDealLost, useUpdateDeal, useDeleteDeal, usePipelines } from '@/hooks/use-deals';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trophy, TrendingUp, X, Pencil, ThumbsDown, Trash2, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
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
  const [form, setForm] = useState({
    title: '', value: '', currency: 'VND',
    stageId: stages[0]?.id ?? '', probability: '50',
    contactId: '', companyId: '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const { data: contacts = [] } = useQuery<any[]>({
    queryKey: ['contacts-list'],
    queryFn: () => api.get('/contacts', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data),
  });
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['companies-list'],
    queryFn: () => api.get('/companies', { params: { limit: 100 } }).then(r => r.data?.data ?? r.data),
  });

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/deals', payload).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); toast.success('Tạo deal thành công'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message ?? 'Tạo thất bại'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      value: form.value ? Number(form.value) : 0,
      probability: Number(form.probability),
      contactId: form.contactId || undefined,
      companyId: form.companyId || undefined,
    });
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Liên hệ</label>
              <select className={inputCls} value={form.contactId} onChange={set('contactId')}>
                <option value="">-- Không chọn --</option>
                {(contacts as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.fullName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Công ty</label>
              <select className={inputCls} value={form.companyId} onChange={set('companyId')}>
                <option value="">-- Không chọn --</option>
                {(companies as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
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
  const { data: pipelines } = usePipelines();
  const [pipelineId, setPipelineId] = useState<string | undefined>(undefined);
  const { data, isLoading } = useDealsKanban(pipelineId);
  const moveDealStage = useMoveDealStage();
  const deleteDeal = useDeleteDeal();
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [editingDeal, setEditingDeal] = useState<any>(null);
  const [lostDeal, setLostDeal] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeDragDeal, setActiveDragDeal] = useState<any>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const { dealData } = event.active.data.current ?? {};
    setActiveDragDeal(dealData ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragDeal(null);
    if (!over) return;
    const fromStageId = active.data.current?.stageId;
    const toStageId = over.id as string;
    if (fromStageId && toStageId && fromStageId !== toStageId) {
      moveDealStage.mutate({ id: active.id as string, stageId: toStageId });
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">Đang tải pipeline...</div>;
  }

  const stages = data?.stages ?? [];
  const totalValue = stages.reduce((sum: number, s: any) => sum + (s.totalValue ?? 0), 0);
  const totalDeals = stages.reduce((acc: number, s: any) => acc + (s.deals?.length ?? 0), 0);
  const allDeals = stages.flatMap((s: any) => s.deals ?? []);

  const handleDelete = () => {
    if (!deleteConfirm) return;
    deleteDeal.mutate(deleteConfirm.id, {
      onSuccess: () => {
        if (selectedDeal?.id === deleteConfirm.id) setSelectedDeal(null);
        setDeleteConfirm(null);
      },
    });
  };

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
        <div className="flex items-center gap-2">
          <div className="flex border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('kanban')} className={`px-2.5 py-2 ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Kanban">
              <LayoutGrid size={15} />
            </button>
            <button onClick={() => setViewMode('list')} className={`px-2.5 py-2 border-l border-gray-200 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`} title="Danh sách">
              <List size={15} />
            </button>
          </div>
          {pipelines && pipelines.length > 1 && (
            <select
              value={pipelineId ?? ''}
              onChange={e => setPipelineId(e.target.value || undefined)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tất cả pipeline</option>
              {pipelines.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button onClick={() => setCreateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            <Plus size={14} /> Thêm deal
          </button>
        </div>
      </div>

      {viewMode === 'kanban' ? (
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Kanban Board */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {stages.map((stage: any) => (
            <StageColumn key={stage.id} stageId={stage.id}>
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
                  <DraggableDealCard
                    key={deal.id}
                    deal={deal}
                    stages={stages}
                    currentStageId={stage.id}
                    isSelected={selectedDeal?.id === deal.id}
                    onSelect={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                    onEdit={() => setEditingDeal(deal)}
                    onMarkLost={() => setLostDeal(deal)}
                    onMoveStage={(stageId) => moveDealStage.mutate({ id: deal.id, stageId })}
                    onDelete={() => setDeleteConfirm(deal)}
                  />
                ))}
                {stage.deals?.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl h-20 flex items-center justify-center">
                    <span className="text-xs text-gray-300">Chưa có deal</span>
                  </div>
                )}
              </div>
            </StageColumn>
          ))}

          {stages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Chưa có pipeline. Hãy cấu hình trong Cài đặt.
            </div>
          )}
        </div>
        <DragOverlay>
          {activeDragDeal ? (
            <div className="bg-white border border-indigo-400 rounded-xl p-3.5 shadow-lg opacity-90 w-64">
              <p className="text-sm font-medium text-gray-900 line-clamp-2">{activeDragDeal.title}</p>
              <span className="text-sm font-semibold text-indigo-600">{formatCurrency(Number(activeDragDeal.value))}</span>
            </div>
          ) : null}
        </DragOverlay>
        </DndContext>

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
      ) : (
      /* ─── List View ─────────────────────────────────────────────────── */
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Deal</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Giá trị</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Giai đoạn</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Xác suất</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phụ trách</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allDeals.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Chưa có deal nào</td></tr>
            )}
            {allDeals.map((deal: any) => {
              const stage = stages.find((s: any) => s.deals?.some((d: any) => d.id === deal.id));
              return (
                <tr key={deal.id} onClick={() => setSelectedDeal(selectedDeal?.id === deal.id ? null : deal)}
                  className={`hover:bg-gray-50/50 cursor-pointer transition-colors ${selectedDeal?.id === deal.id ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{deal.title}</td>
                  <td className="px-4 py-3 text-indigo-600 font-semibold">{formatCurrency(Number(deal.value))}</td>
                  <td className="px-4 py-3">
                    {stage && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                        {stage.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      deal.status === 'WON' ? 'bg-green-100 text-green-700' : deal.status === 'LOST' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}>{deal.status === 'WON' ? 'Thắng' : deal.status === 'LOST' ? 'Thua' : 'Mở'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{deal.probability}%</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{deal.owner?.fullName ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={e => { e.stopPropagation(); setEditingDeal(deal); }} className="p-1 text-gray-400 hover:text-indigo-500"><Pencil size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteConfirm(deal); }} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}

      {/* Modals */}
      {createOpen && <CreateDealModal onClose={() => setCreateOpen(false)} stages={stages} />}
      {editingDeal && <DealEditModal deal={editingDeal} onClose={() => setEditingDeal(null)} />}
      {lostDeal && <MarkLostModal dealId={lostDeal.id} dealTitle={lostDeal.title} onClose={() => setLostDeal(null)} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Xóa deal?</h2>
              <p className="text-sm text-gray-500 mt-1 truncate">"{deleteConfirm.title}"</p>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">Hành động này không thể hoàn tác. Deal và mọi dữ liệu liên quan sẽ bị xóa.</p>
            </div>
            <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-100">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Hủy</button>
              <button onClick={handleDelete} disabled={deleteDeal.isPending} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                {deleteDeal.isPending ? 'Đang xóa...' : 'Xóa deal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DnD helpers ──────────────────────────────────────────────────────────────
function StageColumn({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });
  return (
    <div ref={setNodeRef} className={`w-64 shrink-0 flex flex-col transition-colors rounded-xl ${isOver ? 'bg-indigo-50/60 ring-2 ring-indigo-300 ring-inset' : ''}`}>
      {children}
    </div>
  );
}

interface DealCardProps {
  deal: any; stages: any[]; currentStageId: string; isSelected: boolean;
  onSelect: () => void; onEdit: () => void; onMarkLost: () => void;
  onMoveStage: (stageId: string) => void; onDelete: () => void;
  dragListeners?: Record<string, any>;
}

function DraggableDealCard(props: Omit<DealCardProps, 'dragListeners'>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.deal.id,
    data: { dealData: props.deal, stageId: props.currentStageId },
    disabled: props.deal.status !== 'OPEN',
  });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className={`${isDragging ? 'opacity-30' : ''} ${props.deal.status === 'OPEN' ? 'cursor-grab active:cursor-grabbing' : ''}`}>
      <DealCard {...props} />
    </div>
  );
}

function DealCard({ deal, stages, currentStageId, isSelected, onSelect, onEdit, onMarkLost, onMoveStage, onDelete }: Omit<DealCardProps, 'dragListeners'>) {
  const markWon = useMarkDealWon();

  const statusOverlay = deal.status !== 'OPEN' ? (
    <div className={`absolute inset-0 rounded-xl flex items-center justify-center bg-white/70 backdrop-blur-[1px]`}>
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${deal.status === 'WON' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
        {deal.status === 'WON' ? '🏆 Đã thắng' : '❌ Đã thua'}
      </span>
    </div>
  ) : null;

  const otherStages = stages.filter(s => s.id !== currentStageId);

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
          <button onClick={e => { e.stopPropagation(); onDelete(); }} title="Xóa deal"
            className="p-1 text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
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

      {/* Stage move buttons */}
      {deal.status === 'OPEN' && otherStages.length > 0 && (
        <div className="flex gap-1 mt-2 pt-2 border-t border-gray-50 flex-wrap">
          {otherStages.map(s => (
            <button
              key={s.id}
              onClick={e => { e.stopPropagation(); onMoveStage(s.id); }}
              className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-400 transition-colors"
            >
              <ChevronRight size={10} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
