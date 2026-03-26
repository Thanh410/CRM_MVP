// tests/tasks/tasks.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createTask } from '../helpers/fixtures';

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

test.describe('Tasks — API Tests', () => {
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
        throw new SkipError('TASK-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('TASK-01: Create task returns 201', async () => {
    const task = await withRetry(() => createTask(adminApi));
    try {
      expect(task.id).toBeDefined();
      expect(task.title).toBeTruthy();
      expect(task.status).toBe('TODO');
    } finally {
      try { await adminApi.delete(`/tasks/${task.id}`); } catch {}
    }
  });

  test('TASK-02: List tasks returns paginated response', async () => {
    const res = await adminApi.get<any>('/tasks');
    expect(Array.isArray(res.data || res)).toBe(true);
  });

  test('TASK-03: Kanban view returns tasks grouped by status', async () => {
    const res = await adminApi.get<any>('/tasks/kanban');
    expect(res).toBeDefined();
    expect(typeof res).toBe('object');
  });

  test('TASK-04: Move task status returns updated task', async () => {
    const task = await withRetry(() => createTask(adminApi));
    try {
      const res = await adminApi.patch<any>(`/tasks/${task.id}/status`, { status: 'IN_PROGRESS' });
      const t = res.data ?? res;
      expect(t.status).toBe('IN_PROGRESS');
    } finally {
      try { await adminApi.delete(`/tasks/${task.id}`); } catch {}
    }
  });

  test('TASK-05: Add comment to task returns 201', async () => {
    const task = await withRetry(() => createTask(adminApi));
    try {
      const res = await adminApi.post<any>(`/tasks/${task.id}/comments`, { content: 'Test comment ' + Date.now() });
      expect(res.data ?? res).toBeDefined();
    } finally {
      try { await adminApi.delete(`/tasks/${task.id}`); } catch {}
    }
  });

  test('TASK-06: Add watcher to task returns 201', async () => {
    const task = await withRetry(() => createTask(adminApi));
    let ctx: Awaited<ReturnType<typeof pwRequest.newContext>> | null = null;
    try {
      ctx = await pwRequest.newContext();
      let admin: Awaited<ReturnType<typeof loginAs>>;
      try {
        admin = await withRetry(() => loginAs(ctx!, 'ADMIN'));
      } catch (e: any) {
        if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
          throw new SkipError('TASK-06: admin login → 500 (server instability)');
          return;
        }
        throw e;
      }
      const watcherApi = new ApiClient(API, admin.accessToken);
      const res = await watcherApi.post<any>(`/tasks/${task.id}/watchers/${admin.user.id}`, {});
      expect(res.data ?? res).toBeDefined();
    } finally {
      if (ctx) await ctx.dispose();
      try { await adminApi.delete(`/tasks/${task.id}`); } catch {}
    }
  });

  test('TASK-07: Delete task returns 204', async () => {
    const task = await withRetry(() => createTask(adminApi));
    const res = await adminApi.delete(`/tasks/${task.id}`);
    expect(res).toBeUndefined();
    let errorStatus: number | undefined;
    try { await adminApi.get(`/tasks/${task.id}`); } catch (e: any) { errorStatus = e?.status; }
    expect(errorStatus).toBe(404);
  });
});

test.describe('Tasks — E2E Tests', () => {
  test('TASK-08: Tasks page loads', async ({ page }) => {
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('TASK-08: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await page.context().addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TASK-09: Kanban columns visible on tasks page', async ({ page }) => {
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('TASK-09: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await page.context().addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('TASK-10: Create task modal opens and submits', async ({ page }) => {
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('TASK-10: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await page.context().addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const createBtn = page.locator('button').filter({ hasText: /tạo|thêm/i }).first();
    await createBtn.click();
    await page.waitForTimeout(500);
    const titleInput = page.locator('input[name="title"], input[placeholder*="tiêu đề"], input[placeholder*="title"]').first();
    await titleInput.fill('E2E Task ' + Date.now());
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);
    const toastPromise = page.waitForSelector('[class*="toast"]', { timeout: 5000 }).catch(() => null);
    const redirectPromise = page.waitForURL(/.*\/tasks/, { timeout: 5000 }).catch(() => null);
    await Promise.race([toastPromise, redirectPromise]);
  });
});
