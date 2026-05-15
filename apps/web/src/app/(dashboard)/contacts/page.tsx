'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TagSelector } from '@/components/tag-selector';
import { TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { StatusPill, type StatusTone } from '@/components/ui/status-pill';
import { RippleButton } from '@/components/ui/ripple-button';
import { api } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  X,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  User,
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Contact {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  mobile?: string;
  jobTitle?: string;
  description?: string;
  address?: string;
  companyId?: string;
  assignedTo?: string;
  company?: { id: string; name: string };
  assignee?: { id: string; fullName: string };
  deals?: Deal[];
  createdAt: string;
  updatedAt: string;
}

interface Deal {
  id: string;
  title: string;
  value?: number;
  stage?: string;
  closedAt?: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserItem {
  id: string;
  fullName: string;
}

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  mobile: string;
  jobTitle: string;
  companyId: string;
  assignedTo: string;
  description: string;
  address: string;
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  phone: '',
  mobile: '',
  jobTitle: '',
  companyId: '',
  assignedTo: '',
  description: '',
  address: '',
};

const DEAL_STAGE_TONES: Record<string, StatusTone> = {
  LEAD: 'muted',
  QUALIFIED: 'indigo',
  PROPOSAL: 'amber',
  NEGOTIATION: 'amber',
  WON: 'emerald',
  LOST: 'rose',
};

const DEAL_STAGE_LABELS: Record<string, string> = {
  LEAD: 'Tiềm năng',
  QUALIFIED: 'Đủ điều kiện',
  PROPOSAL: 'Đề xuất',
  NEGOTIATION: 'Đàm phán',
  WON: 'Thắng',
  LOST: 'Thua',
};

// ─── Contact Modal ────────────────────────────────────────────────────────────

function ContactModal({
  contact,
  onClose,
}: {
  contact: Contact | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEdit = !!contact;
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>(
    contact
      ? {
          fullName: contact.fullName ?? '',
          email: contact.email ?? '',
          phone: contact.phone ?? '',
          mobile: contact.mobile ?? '',
          jobTitle: contact.jobTitle ?? '',
          companyId: contact.companyId ?? '',
          assignedTo: contact.assignedTo ?? '',
          description: contact.description ?? '',
          address: contact.address ?? '',
        }
      : EMPTY_FORM,
  );

  const { data: companiesData } = useQuery({
    queryKey: ['companies-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/companies', { params: { limit: 50 } });
      return data;
    },
    staleTime: 60_000,
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-dropdown'],
    queryFn: async () => {
      const { data } = await api.get('/users', { params: { limit: 50 } });
      return data;
    },
    staleTime: 60_000,
  });

  const companies: Company[] = companiesData?.data ?? [];
  const users: UserItem[] = usersData?.data ?? usersData ?? [];

  const createMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const { data } = await api.post('/contacts', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Tạo liên hệ thành công');
      onClose();
    },
    onError: () => toast.error('Tạo liên hệ thất bại'),
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: FormState) => {
      const { data } = await api.patch(`/contacts/${contact!.id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', contact!.id] });
      toast.success('Cập nhật thành công');
      onClose();
    },
    onError: () => toast.error('Cập nhật thất bại'),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error('Họ tên không được để trống');
      return;
    }
    const payload = {
      ...form,
      companyId: form.companyId || undefined,
      assignedTo: form.assignedTo || undefined,
    } as any;
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
      <div className="bg-card text-card-foreground rounded-2xl shadow-lift border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-base font-bold">
            {isEdit ? 'Chỉnh sửa liên hệ' : 'Thêm liên hệ mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
            />
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@example.com"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Điện thoại</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0912 345 678"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
              />
            </div>
          </div>

          {/* Mobile + Job Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Di động</label>
              <input
                value={form.mobile}
                onChange={(e) => set('mobile', e.target.value)}
                placeholder="0987 654 321"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Chức danh</label>
              <input
                value={form.jobTitle}
                onChange={(e) => set('jobTitle', e.target.value)}
                placeholder="Giám đốc kinh doanh"
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Công ty</label>
            <select
              value={form.companyId}
              onChange={(e) => set('companyId', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition bg-white"
            >
              <option value="">— Chọn công ty —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Phụ trách</label>
            <select
              value={form.assignedTo}
              onChange={(e) => set('assignedTo', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition bg-white"
            >
              <option value="">— Chưa phân công —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Địa chỉ</label>
            <input
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="123 Đường ABC, Quận 1, TP.HCM"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Ghi chú</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Thông tin thêm về liên hệ..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <RippleButton type="button" variant="outline" onClick={onClose}>Hủy</RippleButton>
            <RippleButton type="submit" variant="aurora" disabled={isPending}>
              {isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo liên hệ'}
            </RippleButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Slide-over Detail ────────────────────────────────────────────────────────

function ContactSlideOver({
  contactId,
  onClose,
  onEdit,
}: {
  contactId: string;
  onClose: () => void;
  onEdit: (c: Contact) => void;
}) {
  const { data: contact, isLoading } = useQuery<Contact>({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      const { data } = await api.get(`/contacts/${contactId}`);
      return data;
    },
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card text-card-foreground border-l border-border shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="font-display text-base font-bold">Chi tiết liên hệ</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
          >
            <X size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center flex-1 text-muted-foreground text-sm">
            Đang tải...
          </div>
        )}

        {contact && (
          <div className="flex-1 overflow-y-auto">
            {/* Avatar + name */}
            <div className="px-5 py-5 border-b border-border bg-aurora-soft/30">
              <div className="flex items-start gap-4">
                <AvatarGradient id={contact.id ?? contact.fullName} name={contact.fullName} size="lg" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-bold truncate">
                    {contact.fullName}
                  </h3>
                  {contact.jobTitle && (
                    <p className="text-sm text-muted-foreground mt-0.5">{contact.jobTitle}</p>
                  )}
                  {contact.company && (
                    <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                      <Building2 size={13} className="shrink-0" />
                      {contact.company.name}
                    </div>
                  )}
                </div>
                <RippleButton variant="outline" size="sm" onClick={() => onEdit(contact)}>
                  <Pencil size={12} /> Sửa
                </RippleButton>
              </div>
            </div>

            {/* Contact info */}
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Thông tin liên hệ
              </h4>
              <div className="space-y-2.5">
                {contact.email && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Mail size={14} className="text-muted-foreground shrink-0" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-aurora-violet hover:underline truncate"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    {contact.phone}
                  </div>
                )}
                {contact.mobile && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <Phone size={14} className="text-muted-foreground shrink-0" />
                    {contact.mobile}
                    <span className="text-xs text-muted-foreground">(di động)</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <MapPin size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                    {contact.address}
                  </div>
                )}
                {contact.assignee && (
                  <div className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <User size={14} className="text-muted-foreground shrink-0" />
                    Phụ trách: <span className="font-semibold">{contact.assignee.fullName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="px-5 py-4 border-b border-border">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Tags</h4>
              <TagSelector entityType="CONTACT" entityId={contact.id} />
            </div>

            {/* Description */}
            {contact.description && (
              <div className="px-5 py-4 border-b border-border">
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Ghi chú
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
                  {contact.description}
                </p>
              </div>
            )}

            {/* Deals */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-aurora-mint" />
                <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Deals ({contact.deals?.length ?? 0})
                </h4>
              </div>
              {(!contact.deals || contact.deals.length === 0) ? (
                <p className="text-sm text-muted-foreground italic">Chưa có deal nào.</p>
              ) : (
                <div className="space-y-2">
                  {contact.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate">{deal.title}</p>
                        {deal.closedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Dự kiến: {formatDate(deal.closedAt)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {deal.stage && (
                          <StatusPill tone={DEAL_STAGE_TONES[deal.stage] ?? 'muted'}>
                            {DEAL_STAGE_LABELS[deal.stage] ?? deal.stage}
                          </StatusPill>
                        )}
                        {deal.value != null && (
                          <span className="text-sm font-semibold font-display">
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
            <div className="px-5 py-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Tạo ngày {formatDate(contact.createdAt)} · Cập nhật {formatDate(contact.updatedAt)}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals / slide-over state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [slideOverId, setSlideOverId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', { search, page }],
    queryFn: async () => {
      const { data } = await api.get('/contacts', {
        params: { search: search || undefined, page, limit: 20 },
      });
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Đã xóa liên hệ');
    },
    onError: () => toast.error('Xóa thất bại'),
  });

  function openCreate() {
    setEditingContact(null);
    setModalOpen(true);
  }

  function openEdit(contact: Contact, e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditingContact(contact);
    setModalOpen(true);
  }

  function handleDelete(contact: Contact, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Xóa liên hệ "${contact.fullName}"? Hành động này không thể hoàn tác.`)) {
      deleteMutation.mutate(contact.id);
      if (slideOverId === contact.id) setSlideOverId(null);
    }
  }

  const contacts: Contact[] = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Liên hệ</h1>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold text-foreground">{meta?.total ?? 0}</span> liên hệ trong hệ thống
          </p>
        </div>
        <RippleButton variant="aurora" onClick={openCreate}>
          <Plus size={14} /> Thêm liên hệ
        </RippleButton>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-2xl shadow-soft p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm tên, email, số điện thoại..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-aurora-violet focus:ring-4 focus:ring-aurora-violet/15 transition"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'Không tìm thấy liên hệ' : 'Chưa có liên hệ nào'}
            description={search
              ? 'Thử tìm với từ khoá khác.'
              : 'Thêm liên hệ mới hoặc convert từ leads đã qualified.'}
            hints={search ? undefined : [
              'Liên hệ là người thật, có email/SĐT — khác với Lead là khách tiềm năng',
              'Có thể gắn nhiều liên hệ vào 1 công ty',
              'Convert lead → contact tự động giữ lịch sử trao đổi',
            ]}
            action={{ label: 'Thêm liên hệ', onClick: openCreate, icon: Plus }}
          />
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Họ tên
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Email / SĐT
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Công ty
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Chức danh
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Phụ trách
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    onClick={() => setSlideOverId(contact.id)}
                    className="hover:bg-aurora-soft/30 transition-colors cursor-pointer"
                  >
                    {/* Name + avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarGradient id={contact.id ?? contact.fullName} name={contact.fullName} size="sm" />
                        <span className="font-semibold text-foreground">{contact.fullName}</span>
                      </div>
                    </td>

                    {/* Email / Phone */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.email && <div className="truncate max-w-[180px] text-foreground/80">{contact.email}</div>}
                      {contact.phone && <div className="text-xs">{contact.phone}</div>}
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3">
                      {contact.company ? (
                        <div className="flex items-center gap-1.5 text-foreground/80">
                          <Building2 size={13} className="text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[140px]">{contact.company.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>

                    {/* Job title */}
                    <td className="px-4 py-3 text-muted-foreground">
                      {contact.jobTitle ?? <span className="text-muted-foreground/60">—</span>}
                    </td>

                    {/* Assignee */}
                    <td className="px-4 py-3">
                      {contact.assignee?.fullName ? (
                        <div className="flex items-center gap-1.5">
                          <AvatarGradient id={contact.assignee.id ?? contact.assignee.fullName} name={contact.assignee.fullName} size="xs" />
                          <span className="text-xs text-foreground/80">{contact.assignee.fullName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">Chưa phân công</span>
                      )}
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(contact.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={(e) => openEdit(contact, e)}
                          title="Chỉnh sửa"
                          className="p-1.5 text-muted-foreground hover:text-aurora-violet hover:bg-aurora-violet/10 rounded-md transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(contact, e)}
                          title="Xóa"
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta && meta.total > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                <span className="text-xs text-muted-foreground">
                  Hiển thị <span className="font-semibold text-foreground">{(page - 1) * 20 + 1}–{Math.min(page * 20, meta.total)}</span> / {meta.total}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 text-muted-foreground border border-border rounded-lg bg-card disabled:opacity-40 hover:bg-muted transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1.5 text-xs font-semibold text-foreground">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 text-muted-foreground border border-border rounded-lg bg-card disabled:opacity-40 hover:bg-muted transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <ContactModal
          contact={editingContact}
          onClose={() => {
            setModalOpen(false);
            setEditingContact(null);
          }}
        />
      )}

      {/* Detail Slide-over */}
      {slideOverId && (
        <ContactSlideOver
          contactId={slideOverId}
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