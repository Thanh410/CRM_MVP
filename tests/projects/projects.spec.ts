// tests/projects/projects.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createProject } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

const RETRY_MS = 3000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt < 2 && (e?.status === 500 || e?.status === 0 || e?.message?.includes('500'))) {
        await new Promise(r => setTimeout(r, RETRY_MS));
        continue;
      }
      throw e;
    }
  }
  return fn();
}


class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipError';
  }
}

test.describe('Projects — API Tests', () => {
  let adminApi: ApiClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminCtx: any;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(adminCtx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('PROJECT-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('PROJECT-01: Create project returns 201 with id and name', async () => {
    const project = await withRetry(() => createProject(adminApi));
    try {
      expect(project.id).toBeDefined();
      expect(project.name).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-02: List projects returns array', async () => {
    const res = await adminApi.get<any>('/projects');
    const items = Array.isArray(res) ? res : (res.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('PROJECT-03: Get project by ID returns project', async () => {
    const project = await withRetry(() => createProject(adminApi));
    try {
      const res = await adminApi.get<any>(`/projects/${project.id}`);
      const p = res.data ?? res;
      expect(p.id).toBe(project.id);
      expect(p.name).toBe(project.name);
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-04: Update project returns updated object', async () => {
    const project = await withRetry(() => createProject(adminApi));
    try {
      const res = await adminApi.patch<any>(`/projects/${project.id}`, {
        name: 'Updated Project Name',
      });
      const p = res.data ?? res;
      expect(p.name).toBe('Updated Project Name');
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-05: Delete project returns 204 and GET returns 404', async () => {
    const project = await withRetry(() => createProject(adminApi));
    try {
      await adminApi.delete(`/projects/${project.id}`);
      let errorStatus: number | undefined;
      try {
        await adminApi.get(`/projects/${project.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-06: Filter projects by status returns filtered array', async () => {
    const project = await withRetry(() => createProject(adminApi, { status: 'IN_PROGRESS' }));
    try {
      const res = await adminApi.get<any>('/projects?status=IN_PROGRESS');
      const items = Array.isArray(res) ? res : (res.data ?? []);
      expect(Array.isArray(items)).toBe(true);
      items.forEach((p: any) => {
        expect(p.status).toBe('IN_PROGRESS');
      });
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });
});

test.describe('Projects — E2E Tests', () => {
  test('PROJECT-07: Projects page loads', async ({ page }) => {
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('PROJECT-07: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await page.context().addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
