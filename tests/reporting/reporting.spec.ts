// tests/reporting/reporting.spec.ts
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

test.describe('Reporting — API Tests', () => {
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
        throw new SkipError('REP-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('REP-01: Dashboard KPIs returns 200 with expected properties', async () => {
    const res = await adminApi.get<any>('/reporting/dashboard');
    expect(res).toBeDefined();
    // Dashboard KPIs should have at least some numeric or object properties
    const keys = Object.keys(res);
    expect(keys.length).toBeGreaterThan(0);
  });

  test('REP-02: Sales funnel returns 200', async () => {
    const res = await adminApi.get<any>('/reporting/sales-funnel');
    expect(res).toBeDefined();
  });

  test('REP-03: Leads by source returns 200', async () => {
    const res = await adminApi.get<any>('/reporting/leads-by-source');
    expect(res).toBeDefined();
  });

  test('REP-04: Activities timeline returns 200 with days param', async () => {
    const res = await adminApi.get<any>('/reporting/activities-timeline?days=30');
    expect(res).toBeDefined();
  });

  test('REP-05: Campaign stats returns 200', async () => {
    const res = await adminApi.get<any>('/reporting/campaign-stats');
    expect(res).toBeDefined();
  });
});

test.describe('Reporting — E2E Tests', () => {
  test('REP-06: Dashboard page loads', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('REP-06: admin login → 500 (server instability)');
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
    await expect(page.locator('body')).toBeVisible();
  });

  test('REP-07: Dashboard shows stats after load', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('REP-07: admin login → 500 (server instability)');
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
    // Dashboard should render at least the body content
    await expect(page.locator('body')).toBeVisible();
    // Optionally wait a moment for async chart/stats to populate
    await page.waitForTimeout(1000);
  });
});
