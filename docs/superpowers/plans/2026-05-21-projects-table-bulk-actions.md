# Projects Table Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Projects page into a table-first management view with row checkboxes, select-all, bulk delete, and pagination controls for 50, 100, 500, or all projects.

**Architecture:** Keep the MVP client-side because `GET /projects` currently returns all projects and the page already filters in memory. Extract table state and reusable helpers into focused files so selection, filtering, pagination, and delete flows are testable without rendering the whole page.

**Tech Stack:** Next.js App Router, React 18, TanStack Query, Vitest, Testing Library, existing `api`, `toast`, and project service endpoints.

---

## File Structure

- Modify: `apps/web/src/app/(dashboard)/projects/page.tsx`
  - Use the new table component and pagination state.
  - Keep modal and slide-over behavior.
  - Wire single delete and bulk delete mutations.
- Create: `apps/web/src/app/(dashboard)/projects/project-table-utils.ts`
  - Pure helpers for status filter, pagination, page size parsing, and select-all calculations.
- Create: `apps/web/src/app/(dashboard)/projects/project-table.tsx`
  - Desktop/mobile responsive table UI with checkboxes, bulk action bar, pagination footer, and page size selector.
- Create: `apps/web/src/app/(dashboard)/projects/project-table-utils.test.ts`
  - Unit tests for helper behavior.
- Create: `apps/web/src/app/(dashboard)/projects/project-table.test.tsx`
  - Component tests for checkbox selection, select-all, bulk delete visibility, and page size changes.

## Behavior Rules

- Checkbox in table header selects all visible rows on the current filtered/paginated view.
- If all visible rows are selected, clicking header checkbox clears those visible rows from selection.
- Bulk delete button appears only when `selectedIds.size > 0`.
- Bulk delete confirms once with the number of selected projects.
- Bulk delete calls `DELETE /projects/:id` for each selected id, clears selection on success, invalidates `['projects']`, and closes the slide-over if its project was deleted.
- Page size options are `50`, `100`, `500`, and `all`.
- Changing page size resets current page to `1`.
- Changing status filter resets current page to `1` and clears selected ids to avoid deleting hidden rows accidentally.
- `all` shows every filtered project and hides previous/next buttons.
- Empty state remains visible when no filtered projects exist.

---

### Task 1: Add Pure Table Utilities

**Files:**
- Create: `apps/web/src/app/(dashboard)/projects/project-table-utils.ts`
- Test: `apps/web/src/app/(dashboard)/projects/project-table-utils.test.ts`

- [ ] **Step 1: Create utility tests**

Add `apps/web/src/app/(dashboard)/projects/project-table-utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  getPageSizeValue,
  getPaginatedProjects,
  getTotalPages,
  getVisibleSelectionState,
  toggleVisibleSelection,
} from './project-table-utils';

const projects = Array.from({ length: 120 }, (_, index) => ({
  id: `project-${index + 1}`,
  status: index % 2 === 0 ? 'ACTIVE' : 'PLANNING',
}));

describe('project table utilities', () => {
  it('parses page size options', () => {
    expect(getPageSizeValue('50')).toBe(50);
    expect(getPageSizeValue('100')).toBe(100);
    expect(getPageSizeValue('500')).toBe(500);
    expect(getPageSizeValue('all')).toBe('all');
  });

  it('returns the requested page of projects', () => {
    expect(getPaginatedProjects(projects, 2, 50).map((project) => project.id)[0]).toBe('project-51');
    expect(getPaginatedProjects(projects, 1, 'all')).toHaveLength(120);
  });

  it('computes total pages', () => {
    expect(getTotalPages(120, 50)).toBe(3);
    expect(getTotalPages(120, 100)).toBe(2);
    expect(getTotalPages(120, 'all')).toBe(1);
    expect(getTotalPages(0, 50)).toBe(1);
  });

  it('detects visible selection state', () => {
    const visible = projects.slice(0, 3);
    expect(getVisibleSelectionState(visible, new Set())).toEqual({ all: false, some: false });
    expect(getVisibleSelectionState(visible, new Set(['project-1']))).toEqual({ all: false, some: true });
    expect(getVisibleSelectionState(visible, new Set(['project-1', 'project-2', 'project-3']))).toEqual({ all: true, some: false });
  });

  it('toggles all visible rows without touching hidden selections', () => {
    const visible = projects.slice(0, 2);
    const selected = toggleVisibleSelection(visible, new Set(['project-99']));
    expect([...selected].sort()).toEqual(['project-1', 'project-2', 'project-99']);

    const cleared = toggleVisibleSelection(visible, selected);
    expect([...cleared]).toEqual(['project-99']);
  });
});
```

- [ ] **Step 2: Run utility test and verify it fails**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web exec vitest run "src/app/(dashboard)/projects/project-table-utils.test.ts"
```

Expected: fail because `project-table-utils.ts` does not exist.

- [ ] **Step 3: Implement utilities**

Create `apps/web/src/app/(dashboard)/projects/project-table-utils.ts`:

```ts
export type ProjectPageSize = 50 | 100 | 500 | 'all';

export interface ProjectListItem {
  id: string;
  status: string;
}

export function getPageSizeValue(value: string): ProjectPageSize {
  if (value === 'all') return 'all';
  if (value === '100') return 100;
  if (value === '500') return 500;
  return 50;
}

export function getFilteredProjects<T extends ProjectListItem>(projects: T[], statusFilter: string): T[] {
  return statusFilter ? projects.filter((project) => project.status === statusFilter) : projects;
}

export function getTotalPages(total: number, pageSize: ProjectPageSize): number {
  if (pageSize === 'all') return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

export function getPaginatedProjects<T>(projects: T[], page: number, pageSize: ProjectPageSize): T[] {
  if (pageSize === 'all') return projects;
  const start = (page - 1) * pageSize;
  return projects.slice(start, start + pageSize);
}

export function getVisibleSelectionState<T extends { id: string }>(visibleRows: T[], selectedIds: Set<string>) {
  const selectedVisibleCount = visibleRows.filter((row) => selectedIds.has(row.id)).length;
  return {
    all: visibleRows.length > 0 && selectedVisibleCount === visibleRows.length,
    some: selectedVisibleCount > 0 && selectedVisibleCount < visibleRows.length,
  };
}

export function toggleVisibleSelection<T extends { id: string }>(visibleRows: T[], selectedIds: Set<string>): Set<string> {
  const next = new Set(selectedIds);
  const { all } = getVisibleSelectionState(visibleRows, selectedIds);

  for (const row of visibleRows) {
    if (all) next.delete(row.id);
    else next.add(row.id);
  }

  return next;
}
```

- [ ] **Step 4: Run utility test and verify it passes**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web exec vitest run "src/app/(dashboard)/projects/project-table-utils.test.ts"
```

Expected: all tests pass.

---

### Task 2: Build Projects Table Component

**Files:**
- Create: `apps/web/src/app/(dashboard)/projects/project-table.tsx`
- Test: `apps/web/src/app/(dashboard)/projects/project-table.test.tsx`

- [ ] **Step 1: Create component tests**

Add `apps/web/src/app/(dashboard)/projects/project-table.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectTable, type ProjectTableProject } from './project-table';

const projects: ProjectTableProject[] = [
  { id: 'p1', name: 'Alpha', status: 'ACTIVE', _count: { tasks: 2 } },
  { id: 'p2', name: 'Beta', status: 'PLANNING', _count: { tasks: 0 } },
];

function renderTable(overrides: Partial<React.ComponentProps<typeof ProjectTable>> = {}) {
  return render(
    <ProjectTable
      projects={projects}
      selectedIds={new Set()}
      page={1}
      pageSize={50}
      totalPages={1}
      totalCount={2}
      onToggleRow={vi.fn()}
      onToggleVisible={vi.fn()}
      onClearSelection={vi.fn()}
      onBulkDelete={vi.fn()}
      onPageChange={vi.fn()}
      onPageSizeChange={vi.fn()}
      onSelectProject={vi.fn()}
      onEditProject={vi.fn()}
      onDeleteProject={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ProjectTable', () => {
  it('renders rows and row checkboxes', () => {
    renderTable();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('calls select-all handler from header checkbox', () => {
    const onToggleVisible = vi.fn();
    renderTable({ onToggleVisible });
    fireEvent.click(screen.getByLabelText('Chọn tất cả dự án đang hiển thị'));
    expect(onToggleVisible).toHaveBeenCalledTimes(1);
  });

  it('shows bulk delete when rows are selected', () => {
    renderTable({ selectedIds: new Set(['p1']) });
    expect(screen.getByText('1 dự án đã chọn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa dự án đã chọn' })).toBeInTheDocument();
  });

  it('changes page size', () => {
    const onPageSizeChange = vi.fn();
    renderTable({ onPageSizeChange });
    fireEvent.change(screen.getByLabelText('Số dòng mỗi trang'), { target: { value: '100' } });
    expect(onPageSizeChange).toHaveBeenCalledWith('100');
  });
});
```

- [ ] **Step 2: Run component test and verify it fails**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web exec vitest run "src/app/(dashboard)/projects/project-table.test.tsx"
```

Expected: fail because `project-table.tsx` does not exist.

- [ ] **Step 3: Implement ProjectTable**

Create `apps/web/src/app/(dashboard)/projects/project-table.tsx` with:

```tsx
'use client';

import { Calendar, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getVisibleSelectionState, type ProjectPageSize } from './project-table-utils';

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
  pageSize: ProjectPageSize;
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
  const selection = getVisibleSelectionState(projects, selectedIds);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      {selectedIds.size > 0 && (
        <div className="flex flex-col gap-2 border-b border-border bg-aurora-violet px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold">{selectedIds.size} dự án đã chọn</span>
          <div className="flex gap-2">
            <button onClick={onClearSelection} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white">
              Bỏ chọn
            </button>
            <button onClick={onBulkDelete} className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25" aria-label="Xóa dự án đã chọn">
              Xóa dự án đã chọn
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="w-10 px-4 py-3">
                <input
                  aria-label="Chọn tất cả dự án đang hiển thị"
                  type="checkbox"
                  checked={selection.all}
                  ref={(input) => {
                    if (input) input.indeterminate = selection.some;
                  }}
                  onChange={onToggleVisible}
                  className="h-4 w-4 rounded border-border accent-[hsl(var(--aurora-violet))]"
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
              <tr key={project.id} onClick={() => onSelectProject(project.id)} className="cursor-pointer hover:bg-aurora-soft/30">
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
                  {(project.startDate || project.dueDate) ? (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={13} />
                      {formatDate(project.dueDate ?? project.startDate!)}
                    </span>
                  ) : '-'}
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditProject(project.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Sửa ${project.name}`}>
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => onDeleteProject(project.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={`Xóa ${project.name}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Số dòng mỗi trang
          <select value={String(pageSize)} onChange={(event) => onPageSizeChange(event.target.value)} className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs text-foreground" aria-label="Số dòng mỗi trang">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="500">500</option>
            <option value="all">Tất cả</option>
          </select>
        </label>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-xs text-muted-foreground">
            Trang {page}/{totalPages} · {totalCount} dự án
          </span>
          {pageSize !== 'all' && (
            <div className="flex gap-1">
              <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="rounded-lg border border-border bg-card p-2 disabled:opacity-40" aria-label="Trang trước">
                <ChevronLeft size={14} />
              </button>
              <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded-lg border border-border bg-card p-2 disabled:opacity-40" aria-label="Trang sau">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run component test and verify it passes**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web exec vitest run "src/app/(dashboard)/projects/project-table.test.tsx"
```

Expected: all tests pass.

---

### Task 3: Wire Table State Into Projects Page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Add imports and state**

In `apps/web/src/app/(dashboard)/projects/page.tsx`, import:

```ts
import { ProjectTable } from './project-table';
import {
  getFilteredProjects,
  getPageSizeValue,
  getPaginatedProjects,
  getTotalPages,
  toggleVisibleSelection,
  type ProjectPageSize,
} from './project-table-utils';
```

Inside `ProjectsPage`, add:

```ts
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState<ProjectPageSize>(50);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
```

- [ ] **Step 2: Replace filtered calculation with paginated calculation**

Replace:

```ts
const filtered = statusFilter ? projects.filter(p => p.status === statusFilter) : projects;
```

With:

```ts
const filtered = getFilteredProjects(projects, statusFilter);
const totalPages = getTotalPages(filtered.length, pageSize);
const visibleProjects = getPaginatedProjects(filtered, Math.min(page, totalPages), pageSize);
```

- [ ] **Step 3: Add selection handlers**

Add inside `ProjectsPage`:

```ts
const toggleRow = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};

const toggleVisibleRows = () => {
  setSelectedIds((prev) => toggleVisibleSelection(visibleProjects, prev));
};

const clearSelection = () => setSelectedIds(new Set());

const changeStatusFilter = (nextStatus: string) => {
  setStatusFilter(nextStatus);
  setPage(1);
  setSelectedIds(new Set());
};

const changePageSize = (value: string) => {
  setPageSize(getPageSizeValue(value));
  setPage(1);
  setSelectedIds(new Set());
};
```

- [ ] **Step 4: Add bulk delete mutation**

Keep existing `deleteMutation`, then add:

```ts
const bulkDeleteMutation = useMutation({
  mutationFn: async (ids: string[]) => {
    await Promise.all(ids.map((id) => api.delete(`/projects/${id}`)));
  },
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ['projects'] });
    toast.success(`Đã xóa ${selectedIds.size} dự án`);
    if (slideOverId && selectedIds.has(slideOverId)) setSlideOverId(null);
    setSelectedIds(new Set());
  },
  onError: () => toast.error('Xóa dự án đã chọn thất bại'),
});

const handleBulkDelete = () => {
  const ids = Array.from(selectedIds);
  if (ids.length === 0) return;
  if (!window.confirm(`Xóa ${ids.length} dự án đã chọn?`)) return;
  bulkDeleteMutation.mutate(ids);
};
```

- [ ] **Step 5: Update status filter pills**

Change each status filter button to call `changeStatusFilter(...)`:

```tsx
<button onClick={() => changeStatusFilter('')}>Tất cả ({projects.length})</button>
<button key={k} onClick={() => changeStatusFilter(k === statusFilter ? '' : k)}>{v} ({counts[k]})</button>
```

- [ ] **Step 6: Replace project grid with table component**

Replace the current grid rendering block with:

```tsx
{isLoading ? (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div key={index} className="h-36 animate-pulse rounded-xl border border-zinc-200 bg-white" />
    ))}
  </div>
) : filtered.length === 0 ? (
  <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-zinc-400">
    <FolderOpen size={36} className="mb-3 opacity-30" />
    <p className="text-sm">Chưa có dự án nào</p>
    <button onClick={() => setModalOpen(true)} className="mt-3 text-sm text-zinc-900 hover:underline">
      Tạo dự án đầu tiên
    </button>
  </div>
) : (
  <ProjectTable
    projects={visibleProjects}
    selectedIds={selectedIds}
    page={Math.min(page, totalPages)}
    pageSize={pageSize}
    totalPages={totalPages}
    totalCount={filtered.length}
    onToggleRow={toggleRow}
    onToggleVisible={toggleVisibleRows}
    onClearSelection={clearSelection}
    onBulkDelete={handleBulkDelete}
    onPageChange={setPage}
    onPageSizeChange={changePageSize}
    onSelectProject={setSlideOverId}
    onEditProject={(id) => {
      const project = projects.find((item) => item.id === id);
      if (project) openEdit(project);
    }}
    onDeleteProject={(id) => {
      const project = projects.find((item) => item.id === id);
      if (project) handleDelete(project);
    }}
  />
)}
```

- [ ] **Step 7: Run page-related tests**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web exec vitest run "src/app/(dashboard)/projects/project-table-utils.test.ts" "src/app/(dashboard)/projects/project-table.test.tsx"
```

Expected: all tests pass.

---

### Task 4: Backend Safety And Manual Verification

**Files:**
- No new backend endpoint required for MVP because the current page already receives all projects.
- Optional later optimization: add `GET /projects?page=&limit=&status=` and `DELETE /projects/bulk` if project counts become large.

- [ ] **Step 1: Run web build**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web build
```

Expected: Next build succeeds.

- [ ] **Step 2: Start web app**

Run:

```powershell
$env:PATH="C:\tmp\node-v20.19.5-win-x64;$env:PATH"; pnpm --filter web dev
```

Expected: web runs on `http://localhost:3001`.

- [ ] **Step 3: Manual test selection**

Open `http://localhost:3001/projects` and verify:

```text
1. Table renders projects.
2. Selecting one row shows "1 dự án đã chọn".
3. Header checkbox selects every visible row.
4. Header checkbox again clears every visible row.
5. Bulk delete asks for confirmation once.
```

- [ ] **Step 4: Manual test pagination**

On `http://localhost:3001/projects`, verify:

```text
1. Page size defaults to 50.
2. Changing to 100 resets to page 1.
3. Changing to 500 resets to page 1.
4. Changing to Tất cả shows all filtered projects.
5. Status filter resets page to 1 and clears selected rows.
```

- [ ] **Step 5: Commit**

Run:

```powershell
git add "apps/web/src/app/(dashboard)/projects/page.tsx" "apps/web/src/app/(dashboard)/projects/project-table.tsx" "apps/web/src/app/(dashboard)/projects/project-table-utils.ts" "apps/web/src/app/(dashboard)/projects/project-table.test.tsx" "apps/web/src/app/(dashboard)/projects/project-table-utils.test.ts"
git commit -m "feat: add project table bulk actions"
```

Expected: commit succeeds with only project table files included.

---

## Self-Review

- Spec coverage: table checkbox, select-all, bulk delete, page size 50/100/500/all, pagination behavior, and status filter reset are all covered.
- Placeholder scan: no steps use TBD/TODO or vague instructions.
- Type consistency: `ProjectPageSize`, `ProjectTableProject`, and helper names are introduced before use and match across tasks.
