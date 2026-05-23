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
