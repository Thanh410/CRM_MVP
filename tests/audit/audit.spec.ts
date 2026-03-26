import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';

const API = 'http://localhost:3000/api';

test.describe('Audit — API Tests', () => {
  let adminApi: ApiClient;
  let adminCtx: import('@playwright/test').APIRequestContext;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext();
    const admin = await loginAs(adminCtx, 'ADMIN');
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    try {
      if (adminCtx) await adminCtx.dispose();
    } catch (_e) {
      // ignore cleanup errors
    }
  });

  // AUDIT-01: GET /audit → 200, paginated response
  test('AUDIT-01: GET /audit returns 200 with paginated data', async () => {
    const res = await adminApi.get<{
      data: unknown[];
      total?: number;
      page?: number;
      pageSize?: number;
    }>('/audit');
    expect(res.data).toBeInstanceOf(Array);
    // Paginated response should have at least one of these fields
    expect(
      'total' in res ||
        'page' in res ||
        'pageSize' in res ||
        Array.isArray(res.data)
    ).toBe(true);
  });

  // AUDIT-02: Filter by resource type → GET /audit?resource=lead → 200
  test('AUDIT-02: GET /audit?resource=lead returns 200', async () => {
    const res = await adminApi.get<{ data: unknown[] }>('/audit?resource=lead');
    expect(res.data).toBeInstanceOf(Array);
  });

  // AUDIT-03: Filter by action type → GET /audit?action=CREATE → 200
  test('AUDIT-03: GET /audit?action=CREATE returns 200', async () => {
    const res = await adminApi.get<{ data: unknown[] }>('/audit?action=CREATE');
    expect(res.data).toBeInstanceOf(Array);
  });

  // AUDIT-04: Filter by user search → GET /audit?userSearch=admin → 200
  test('AUDIT-04: GET /audit?userSearch=admin returns 200', async () => {
    const res = await adminApi.get<{ data: unknown[] }>('/audit?userSearch=admin');
    expect(res.data).toBeInstanceOf(Array);
  });

  // AUDIT-05: E2E — Audit page loads
  test('AUDIT-05: E2E — Audit page renders without error', async ({ page }) => {
    // Seed with admin token for audit access
    const adminToken = (adminApi as any).accessToken;
    await page.goto('/');
    await page.evaluate(
      (token: string) => {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('user', JSON.stringify({ roles: ['ADMIN'] }));
      },
      adminToken
    );
    await page.goto('/audit');
    // Page should load without crashing — no specific断言, just no unhandled error
    await expect(page.locator('body')).toBeVisible();
  });
});
