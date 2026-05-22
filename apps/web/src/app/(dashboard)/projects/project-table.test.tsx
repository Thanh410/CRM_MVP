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
