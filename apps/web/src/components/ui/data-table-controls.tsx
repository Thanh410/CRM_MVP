'use client';

import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';

export type DataTablePageSize = 50 | 100 | 500 | 'all';

export const DATA_TABLE_PAGE_SIZES: DataTablePageSize[] = [50, 100, 500, 'all'];

export function parseDataTablePageSize(value: string): DataTablePageSize {
  if (value === 'all') return 'all';
  if (value === '100') return 100;
  if (value === '500') return 500;
  return 50;
}

export function getDataTableQueryParams(page: number, pageSize: DataTablePageSize) {
  return pageSize === 'all'
    ? { page: 1, all: true }
    : { page, limit: pageSize };
}

export function getSelectionState<T extends { id: string }>(rows: T[], selectedIds: Set<string>) {
  const selectedVisibleCount = rows.filter((row) => selectedIds.has(row.id)).length;
  return {
    all: rows.length > 0 && selectedVisibleCount === rows.length,
    some: selectedVisibleCount > 0 && selectedVisibleCount < rows.length,
  };
}

export function toggleVisibleSelection<T extends { id: string }>(rows: T[], selectedIds: Set<string>) {
  const next = new Set(selectedIds);
  const { all } = getSelectionState(rows, selectedIds);
  rows.forEach((row) => {
    if (all) next.delete(row.id);
    else next.add(row.id);
  });
  return next;
}

interface SelectableHeaderCheckboxProps<T extends { id: string }> {
  rows: T[];
  selectedIds: Set<string>;
  onToggle: () => void;
  label?: string;
}

export function SelectableHeaderCheckbox<T extends { id: string }>({
  rows,
  selectedIds,
  onToggle,
  label = 'Chọn tất cả dòng đang hiển thị',
}: SelectableHeaderCheckboxProps<T>) {
  const selection = getSelectionState(rows, selectedIds);

  return (
    <input
      aria-label={label}
      type="checkbox"
      checked={selection.all}
      ref={(input) => {
        if (input) input.indeterminate = selection.some;
      }}
      onChange={onToggle}
      className="h-4 w-4 rounded border-border accent-[hsl(var(--aurora-violet))]"
    />
  );
}

interface BulkActionBarProps {
  count: number;
  entityLabel: string;
  onClear: () => void;
  onDelete: () => void;
}

export function BulkActionBar({ count, entityLabel, onClear, onDelete }: BulkActionBarProps) {
  if (count <= 0) return null;

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-aurora-violet px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-semibold">
        {count} {entityLabel} đã chọn
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          <X size={13} />
          Bỏ chọn
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
          aria-label={`Xóa ${entityLabel} đã chọn`}
        >
          <Trash2 size={13} />
          Xóa đã chọn
        </button>
      </div>
    </div>
  );
}

interface DataTablePaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: DataTablePageSize;
  itemLabel: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: string) => void;
}

export function DataTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  itemLabel,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        Số dòng mỗi trang
        <select
          value={String(pageSize)}
          onChange={(event) => onPageSizeChange(event.target.value)}
          className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground"
          aria-label="Số dòng mỗi trang"
        >
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="500">500</option>
          <option value="all">Tất cả</option>
        </select>
      </label>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs text-muted-foreground">
          Trang {page}/{safeTotalPages} · {total} {itemLabel}
          {pageSize === 'all' ? ' · đang xem tất cả' : ''}
        </span>
        {pageSize !== 'all' && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border bg-card p-2 disabled:opacity-40"
              aria-label="Trang trước"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
              disabled={page >= safeTotalPages}
              className="rounded-lg border border-border bg-card p-2 disabled:opacity-40"
              aria-label="Trang sau"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
