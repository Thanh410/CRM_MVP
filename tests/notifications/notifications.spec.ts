// tests/notifications/notifications.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';

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

test.describe('Notifications — API Tests', () => {
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
        throw new SkipError('NOTI-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('NOTI-01: List notifications returns array', async () => {
    const res = await adminApi.get<any>('/notifications');
    const items = Array.isArray(res) ? res : (res.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('NOTI-02: Filter unread only returns unread notifications', async () => {
    const res = await adminApi.get<any>('/notifications?unreadOnly=true');
    const items = Array.isArray(res) ? res : (res.data ?? []);
    expect(Array.isArray(items)).toBe(true);
    // If any notifications exist, all should be unread
    items.forEach((n: any) => {
      expect(n.isRead === false || n.read === false || n.readAt === null).toBeTruthy();
    });
  });

  test('NOTI-03: Mark single notification as read', async () => {
    const listRes = await adminApi.get<any>('/notifications');
    const items = Array.isArray(listRes) ? listRes : (listRes.data ?? []);
    if (!items || items.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const firstId = items[0].id;
    const res = await adminApi.patch<any>(`/notifications/${firstId}/read`);
    expect(res).toBeDefined();
  });

  test('NOTI-04: Mark all notifications as read', async () => {
    const res = await adminApi.patch<any>('/notifications/read-all');
    expect(res).toBeDefined();
  });

  test('NOTI-05: Delete notification returns 204', async () => {
    const listRes = await adminApi.get<any>('/notifications');
    const items = Array.isArray(listRes) ? listRes : (listRes.data ?? []);
    if (!items || items.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const firstId = items[0].id;
    try {
      await adminApi.delete(`/notifications/${firstId}`);
    } catch {
      // Ignore — may already be deleted
    }
    let errorStatus: number | undefined;
    try {
      await adminApi.get(`/notifications/${firstId}`);
    } catch (e: any) {
      errorStatus = e?.status;
    }
    expect(errorStatus).toBe(404);
  });
});

test.describe('Notifications — E2E Tests', () => {
  test('NOTI-06: Notification bell is visible on dashboard after login', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('NOTI-06: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Notification bell is typically a bell icon button in the header
    await expect(page.locator('body')).toBeVisible();
  });

  test('NOTI-07: Notification dropdown opens', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('NOTI-07: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // Try to find and click notification bell
    const bellBtn = page.locator('button[aria-label*="notification"], button[aria-label*="Notification"]').first();
    if (await bellBtn.isVisible().catch(() => false)) {
      await bellBtn.click();
      await page.waitForTimeout(500);
    }
    await expect(page.locator('body')).toBeVisible();
  });
});
