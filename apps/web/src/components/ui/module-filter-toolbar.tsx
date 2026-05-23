'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Filter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
}

interface ModuleFilterToolbarProps {
  searchPlaceholder?: string;
  filters?: FilterOption[];
  className?: string;
  onChange?: () => void;
}

export function useUrlFilters(keys: string[] = ['q', 'status', 'ownerId', 'assignedTo', 'dateFrom', 'dateTo']) {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const values: Record<string, string> = {};
    keys.forEach((key) => {
      const value = searchParams.get(key);
      if (value) values[key] = value;
    });
    return values;
  }, [keys, searchParams]);
}

export function ModuleFilterToolbar({
  searchPlaceholder = 'Tìm kiếm...',
  filters = [],
  className,
  onChange,
}: ModuleFilterToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    const q = searchParams.get('q');
    if (q) items.push({ key: 'q', label: `Từ khóa: ${q}` });

    filters.forEach((filter) => {
      const value = searchParams.get(filter.key);
      const option = filter.options.find((item) => item.value === value);
      if (value && option) items.push({ key: filter.key, label: `${filter.label}: ${option.label}` });
    });

    return items;
  }, [filters, searchParams]);

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    onChange?.();
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    ['q', 'status', 'ownerId', 'assignedTo', 'dateFrom', 'dateTo'].forEach((key) => params.delete(key));
    params.set('page', '1');
    setSearch('');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    onChange?.();
  };

  useEffect(() => {
    setSearch(searchParams.get('q') ?? '');
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((searchParams.get('q') ?? '') !== search) setParam('q', search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const FilterControls = (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      {filters.map((filter) => (
        <label key={filter.key} className="flex min-w-0 flex-col gap-1 text-xs font-semibold text-muted-foreground sm:min-w-40">
          {filter.label}
          <select
            value={searchParams.get(filter.key) ?? ''}
            onChange={(event) => setParam(filter.key, event.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-normal text-foreground"
          >
            <option value="">Tất cả</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );

  return (
    <div className={cn('rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="relative min-w-0 flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-aurora-violet focus:outline-none focus:ring-4 focus:ring-aurora-violet/15"
          />
        </div>

        <div className="hidden lg:block">{FilterControls}</div>

        {filters.length > 0 && (
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold lg:hidden"
          >
            <Filter size={14} />
            Bộ lọc
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <span key={filter.key} className="inline-flex items-center gap-1 rounded-full bg-aurora-violet/10 px-2.5 py-1 text-xs font-semibold text-aurora-violet">
              {filter.label}
              <button type="button" onClick={() => setParam(filter.key, '')} aria-label={`Xóa ${filter.label}`}>
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
            Xóa bộ lọc
          </button>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 p-3 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div
            className="safe-area-bottom ml-auto mt-auto max-h-[80dvh] w-full overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">Bộ lọc</p>
              <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                <X size={16} />
              </button>
            </div>
            {FilterControls}
          </div>
        </div>
      )}
    </div>
  );
}
