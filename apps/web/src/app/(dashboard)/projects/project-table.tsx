'use client';

import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  BulkActionBar,
  DataTablePagination,
  SelectableHeaderCheckbox,
  type DataTablePageSize,
} from '@/components/ui/data-table-controls';

export interface ProjectTableProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  startDate?: string;
  dueDate?: string;
  dept?: { id: string; name: string };
  owner?: { id: string; fullName: string; avatar?: string };
  _count?: { tasks: number };
}

interface ProjectTableProps {
  projects: ProjectTableProject[];
  selectedIds: Set<string>;
  page: number;
  pageSize: DataTablePageSize;
  totalPages: number;
  totalCount: number;
  onToggleRow: (id: string) => void;
  onToggleVisible: () => void;
  onClearSelection: () => void;
  onBulkDelete: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: string) => void;
  onSelectProject: (id: string) => void;
  onEditProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Lên kế hoạch',
  ACTIVE: 'Đang chạy',
  ON_HOLD: 'Tạm dừng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Hủy bỏ',
};

const STATUS_STYLES: Record<string, string> = {
  PLANNING: 'bg-zinc-100 text-zinc-600',
  ACTIVE: 'bg-blue-100 text-blue-700',
  ON_HOLD: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

export function ProjectTable({
  projects,
  selectedIds,
  page,
  pageSize,
  totalPages,
  totalCount,
  onToggleRow,
  onToggleVisible,
  onClearSelection,
  onBulkDelete,
  onPageChange,
  onPageSizeChange,
  onSelectProject,
  onEditProject,
  onDeleteProject,
}: ProjectTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <BulkActionBar count={selectedIds.size} entityLabel="dự án" onClear={onClearSelection} onDelete={onBulkDelete} />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                <SelectableHeaderCheckbox
                  rows={projects}
                  selectedIds={selectedIds}
                  onToggle={onToggleVisible}
                  label="Chọn tất cả dự án đang hiển thị"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dự án</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phòng ban</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhiệm vụ</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hạn</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {projects.map((project) => (
              <tr
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="cursor-pointer hover:bg-aurora-soft/30"
              >
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <input
                    aria-label={`Chọn ${project.name}`}
                    type="checkbox"
                    checked={selectedIds.has(project.id)}
                    onChange={() => onToggleRow(project.id)}
                    className="h-4 w-4 rounded border-border accent-[hsl(var(--aurora-violet))]"
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-foreground">{project.name}</p>
                  {project.description && <p className="line-clamp-1 text-xs text-muted-foreground">{project.description}</p>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[project.status] ?? STATUS_STYLES.PLANNING}`}>
                    {STATUS_LABELS[project.status] ?? project.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{project.dept?.name ?? '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{project._count?.tasks ?? 0}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.startDate || project.dueDate ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} />
                      {formatDate(project.dueDate ?? project.startDate!)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditProject(project.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Sửa ${project.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProject(project.id)}
                      className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                      aria-label={`Xóa ${project.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DataTablePagination
        page={page}
        totalPages={totalPages}
        total={totalCount}
        pageSize={pageSize}
        itemLabel="dự án"
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
