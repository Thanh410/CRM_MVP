'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Search, Users, Briefcase, Building2, CheckSquare, LayoutDashboard, Settings, X } from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data: leads = [] } = useQuery({
    queryKey: ['cmd-leads', query],
    queryFn: () => api.get('/leads', { params: { search: query, limit: 5 } }).then(r => r.data?.data ?? []),
    enabled: open && query.length >= 1,
    staleTime: 10_000,
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['cmd-contacts', query],
    queryFn: () => api.get('/contacts', { params: { search: query, limit: 5 } }).then(r => r.data?.data ?? []),
    enabled: open && query.length >= 1,
    staleTime: 10_000,
  });

  const { data: companies = [] } = useQuery({
    queryKey: ['cmd-companies', query],
    queryFn: () => api.get('/companies', { params: { search: query, limit: 5 } }).then(r => r.data?.data ?? []),
    enabled: open && query.length >= 1,
    staleTime: 10_000,
  });

  const navigate = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const staticPages = [
    { label: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Khách hàng tiềm năng', href: '/leads', icon: Users },
    { label: 'Liên hệ', href: '/contacts', icon: Users },
    { label: 'Công ty', href: '/companies', icon: Building2 },
    { label: 'Cơ hội kinh doanh', href: '/deals', icon: Briefcase },
    { label: 'Nhiệm vụ', href: '/tasks', icon: CheckSquare },
    { label: 'Cài đặt', href: '/settings', icon: Settings },
  ].filter(p => !query || p.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
        <Command className="flex flex-col" shouldFilter={false}>
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-100">
            <Search size={16} className="text-zinc-400 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Tìm kiếm lead, liên hệ, công ty..."
              autoFocus
              className="flex-1 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none bg-transparent"
            />
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 rounded transition">
              <X size={14} />
            </button>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[360px] overflow-y-auto py-2">
            <Command.Empty className="py-10 text-center text-sm text-zinc-400">
              Không tìm thấy kết quả nào
            </Command.Empty>

            {/* Pages */}
            {staticPages.length > 0 && (
              <Command.Group heading="Trang">
                {staticPages.map(p => (
                  <Command.Item
                    key={p.href}
                    onSelect={() => navigate(p.href)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 cursor-pointer hover:bg-zinc-50 data-[selected]:bg-zinc-50 transition-colors"
                  >
                    <p.icon size={14} className="text-zinc-400 shrink-0" />
                    {p.label}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Leads */}
            {(leads as any[]).length > 0 && (
              <Command.Group heading="Leads">
                {(leads as any[]).map((lead: any) => (
                  <Command.Item
                    key={lead.id}
                    onSelect={() => navigate(`/leads?q=${encodeURIComponent(lead.fullName)}`)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 data-[selected]:bg-zinc-50 transition-colors"
                  >
                    <Users size={14} className="text-blue-400 shrink-0" />
                    <span className="flex-1 truncate text-zinc-700">{lead.fullName}</span>
                    {lead.email && <span className="text-xs text-zinc-400 truncate max-w-[140px]">{lead.email}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Contacts */}
            {(contacts as any[]).length > 0 && (
              <Command.Group heading="Liên hệ">
                {(contacts as any[]).map((c: any) => (
                  <Command.Item
                    key={c.id}
                    onSelect={() => navigate('/contacts')}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 data-[selected]:bg-zinc-50 transition-colors"
                  >
                    <Users size={14} className="text-emerald-400 shrink-0" />
                    <span className="flex-1 truncate text-zinc-700">{c.fullName}</span>
                    {c.company?.name && <span className="text-xs text-zinc-400 truncate max-w-[140px]">{c.company.name}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Companies */}
            {(companies as any[]).length > 0 && (
              <Command.Group heading="Công ty">
                {(companies as any[]).map((co: any) => (
                  <Command.Item
                    key={co.id}
                    onSelect={() => navigate('/companies')}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm cursor-pointer hover:bg-zinc-50 data-[selected]:bg-zinc-50 transition-colors"
                  >
                    <Building2 size={14} className="text-amber-400 shrink-0" />
                    <span className="flex-1 truncate text-zinc-700">{co.name}</span>
                    {co.industry && <span className="text-xs text-zinc-400 truncate">{co.industry}</span>}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-100 flex items-center gap-3 text-[11px] text-zinc-400">
            <span><kbd className="bg-zinc-100 px-1 rounded border border-zinc-200">↑↓</kbd> điều hướng</span>
            <span><kbd className="bg-zinc-100 px-1 rounded border border-zinc-200">↵</kbd> chọn</span>
            <span><kbd className="bg-zinc-100 px-1 rounded border border-zinc-200">ESC</kbd> đóng</span>
          </div>
        </Command>
      </div>
    </div>
  );
}
