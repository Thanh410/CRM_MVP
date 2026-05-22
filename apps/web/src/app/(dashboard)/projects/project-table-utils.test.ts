import { describe, expect, it } from 'vitest';
import {
  getFilteredProjects,
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

  it('filters projects by status', () => {
    expect(getFilteredProjects(projects, '')).toHaveLength(120);
    expect(getFilteredProjects(projects, 'ACTIVE')).toHaveLength(60);
    expect(getFilteredProjects(projects, 'PLANNING')).toHaveLength(60);
    expect(getFilteredProjects(projects, 'COMPLETED')).toHaveLength(0);
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
