'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDate, formatCurrency, getInitials } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Globe,
  Users,
  Pencil,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  TrendingUp,
  FileText,
  ChevronLeft,
  ChevronRight,
  Hash,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  website?: string;
  phone?: string;
  email?: string;
  taxCode?: string;
  address?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { contacts: number; deals: number };
}

interface CompanyDetail extends Company {
  contacts: ContactItem[];
  deals: DealItem[];
}

interface ContactItem {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
}

interface DealItem {
  id: string;
  title: string;
  value?: number;
  stage?: string;
  closedAt?: string;
}

interface FormState {
  name: string;
  industry: string;
  size: string;
  website: string;
  phone: string;
  email: string;
  taxCode: string;
  address: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  industry: '',
  size: '',
  website: '',
  phone: '',
  email: '',
  taxCode: '',
  address: '',
  description: '',
};

const DEAL_STAGE_COLORS: Record<string, string> = {
  LEAD: 'bg-gray-100 text-gray-600',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const DEAL_STAGE_LABELS: Record<string, string> = {
  LEAD: 'Tiềm năng',
  QUALIFIED: 'Đủ điều kiện',
  PROPOSAL: 'Đề xuất',
  NEGOTIATION: 'Đàm phán',
  WON: 'Thắng',
  LOST: 'Thua',
};

// ─── Company Modal ────────────────────────────────────────────────────────────

function CompanyModal({
  company,
  onClose,
}: {
  company: Company | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!company;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>(
    company
      ? {
          name: company.name ?? '',
          industry: company.industry ?? '',
          size: company.size ?? '',
          website: company.website ?? '',
          phone: company.phone ?? '',
          email: company.email ?? '',
          taxCode: company.taxCode ?? '',
          address: company.address ?? '',
          description: company.description ?? '',
        }
      : EMPTY_FORM,
  );

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<FormState>) => {
      const { data } = await api.post('/companies', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Tạo công ty thành công');
      onClose();
    },
    onError: () => toast.error('Tạo công ty thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<FormState>) => {
      const { data } = await api.patch(`/companies/${company!.id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', company!.id] });
      toast.success('Cập nhật thành công');
      onClose();
    },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Tên công ty không được để trống');
      return;
    }
    // strip empty strings to undefined so backend ignores them
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]),
    ) as Partial<FormState>;

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  }

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Chỉnh sửa công ty' : 'Thêm công ty mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Tên công ty <span className="text-red-500">*</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="VD: Công ty TNHH ABC"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Industry + Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngành nghề</label>
              <input
                value={form.industry}
                onChange={(e) => set('industry', e.target.value)}
                placeholder="Công nghệ, Bán lẻ..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quy mô (nhân viên)</label>
              <input
                value={form.size}
                onChange={(e) => set('size', e.target.value)}
                placeholder="1-10, 11-50, 51-200..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Website + Tax Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input
                value={form.website}
                onChange={(e) => set('website', e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mã số thuế</label>
              <input
                value={form.taxCode}
                onChange={(e) => set('taxCode', e.target.value)}
                placeholder="0123456789"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="028 1234 5678"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="info@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Thông tin thêm về công ty..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition"
            >
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo công ty'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Slide-over Detail ────────────────────────────────────────────────────────

function CompanySlideOver({
  companyId,
  onClose,
  onEdit,
}: {
  companyId: string;
  onClose: () => void;
  onEdit: (c: Company) => void;
}) {
  const { data: company, isLoading } = useQuery<CompanyDetail>({
    queryKey: ['company', companyId],
    queryFn: async () => {
      const { data } = await api.get(`/companies/${companyId}`);
      return data;
    },
  });

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Chi tiết công ty</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
            Đang tải...
          </div>
        )}

        {company && (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="px-5 py-5 border-b border-gray-50">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-indigo-700">
                    {getInitials(company.name)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{company.name}</h3>
                  {company.industry && (
                    <p className="text-sm text-gray-500 mt-0.5">{company.industry}</p>
                  )}
                  {company.size && (
                    <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {company.size} nhân viên
                    </span>
                  )}
                </div>
                <button
                  onClick={() => onEdit(company)}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
                >
                  <Pencil size={12} /> Sửa
                </button>
              </div>
            </div>

            {/* Contact info */}
            <div className="px-5 py-4 border-b border-gray-50">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Thông tin liên hệ
              </h4>
              <div className="space-y-2.5">
                {company.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${company.email}`}
                      className="text-indigo-600 hover:underline truncate"
                    >
                      {company.email}
                    </a>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    {company.phone}
                  </div>
                )}
                {company.website && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Globe size={14} className="text-gray-400 shrink-0" />
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:underline truncate"
                    >
                      {company.website}
                    </a>
                  </div>
                )}
                {company.taxCode && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Hash size={14} className="text-gray-400 shrink-0" />
                    MST: {company.taxCode}
                  </div>
                )}
                {company.address && (
                  <div className="flex items-start gap-2.5 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 shrink-0 mt-0.5" />
                    {company.address}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {company.description && (
              <div className="px-5 py-4 border-b border-gray-50">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Mô tả
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </div>
            )}

            {/* Contacts */}
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Liên hệ ({company.contacts?.length ?? 0})
                </h4>
              </div>
              {(!company.contacts || company.contacts.length === 0) ? (
                <p className="text-sm text-gray-400 italic">Chưa có liên hệ nào.</p>
              ) : (
                <div className="space-y-2">
                  {company.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-emerald-700">
                          {getInitials(contact.fullName)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {contact.fullName}
                        </p>
                        {contact.jobTitle && (
                          <p className="text-xs text-gray-400 truncate">{contact.jobTitle}</p>
                        )}
                      </div>
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-gray-400 hover:text-indigo-600 transition shrink-0"
                          title={contact.email}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Mail size={13} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Deals */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-gray-400" />
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Deals ({company.deals?.length ?? 0})
                </h4>
              </div>
              {(!company.deals || company.deals.length === 0) ? (
                <p className="text-sm text-gray-400 italic">Chưa có deal nào.</p>
              ) : (
                <div className="space-y-2">
                  {company.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{deal.title}</p>
                        {deal.closedAt && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Dự kiến: {formatDate(deal.closedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {deal.stage && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              DEAL_STAGE_COLORS[deal.stage] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}
                          </span>
                        )}
                        {deal.value != null && (
                          <span className="text-sm font-semibold text-gray-700">
                            {formatCurrency(deal.value)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Meta */}
            <div className="px-5 py-3 border-t border-gray-50">
              <p className="text-xs text-gray-400">
                Tạo ngày {formatDate(company.createdAt)} · Cập nhật {formatDate(company.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modal / slide-over state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search, page }],
    queryFn: async () => {
      const { data } = await api.get('/companies', {
        params: { search: search || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Đã xóa công ty');
    },
    onError: () => toast.error('Xóa thất bại'),
  });

  function openCreate() {
    setEditingCompany(null);
    setModalOpen(true);
  }

  function openEdit(company: Company, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingCompany(company);
    setModalOpen(true);
  }

  function handleDelete(company: Company, e: React.MouseEvent) {
    e.stopPropagation();
    if (
      window.confirm(`Xóa công ty "${company.name}"? Hành động này không thể hoàn tác.`)
    ) {
      deleteMutation.mutate(company.id);
      if (slideOverId === company.id) setSlideOverId(null);
    }
  }

  const companies: Company[] = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Công ty</h1>
          <p className="text-sm text-gray-500 mt-0.5">{meta?.total ?? 0} công ty</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus size={14} /> Thêm công ty
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên công ty, ngành nghề..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && (
          <div className="col-span-3 flex items-center justify-center h-32 text-gray-400 text-sm">
            Đang tải...
          </div>
        )}
        {!isLoading && companies.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center h-32 gap-2 text-gray-400 text-sm">
            <Building2 size={28} className="text-gray-300" />
            Chưa có công ty nào. Nhấn "Thêm công ty" để bắt đầu.
          </div>
        )}
        {companies.map((company) => (
          <div
            key={company.id}
            onClick={() => setSlideOverId(company.id)}
            className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            {/* Action buttons — visible on hover */}
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => openEdit(company, e)}
                title="Chỉnh sửa"
                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={(e) => handleDelete(company, e)}
                title="Xóa"
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Card content */}
            <div className="flex items-start gap-3 mb-3 pr-12">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-indigo-700">
                  {getInitials(company.name)}
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                {company.industry && (
                  <span className="text-xs text-gray-400 mt-0.5 block truncate">
                    {company.industry}
                  </span>
                )}
              </div>
            </div>

            {company.size && (
              <div className="mb-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {company.size} nhân viên
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              {company.website && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Globe size={12} className="shrink-0" />
                  <span className="truncate">{company.website}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Mail size={12} className="shrink-0" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Phone size={12} className="shrink-0" />
                  <span>{company.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-gray-400 pt-1 border-t border-gray-50 mt-2">
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  {company._count?.contacts ?? 0} liên hệ
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp size={12} />
                  {company._count?.deals ?? 0} deals
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {meta && meta.total > 20 && (
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-gray-400">
            Hiển thị {(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)} / {meta.total}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-3 py-1.5 text-xs text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 text-gray-500 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <CompanyModal
          company={editingCompany}
          onClose={() => {
            setModalOpen(false);
            setEditingCompany(null);
          }}
        />
      )}

      {/* Detail Slide-over */}
      {slideOverId && (
        <CompanySlideOver
          companyId={slideOverId}
          onClose={() => setSlideOverId(null)}
          onEdit={(c) => {
            setSlideOverId(null);
            openEdit(c);
          }}
        />
      )}
    </div>
  );
}
