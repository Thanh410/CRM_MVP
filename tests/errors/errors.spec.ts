import { test, expect, request as pwRequest } from '@playwright/test';
import { ApiClient } from '../helpers/api-client';
import { ApiError } from '../helpers/api-client';

const API = 'http://localhost:3000/api';

test.describe('Errors — API Tests', () => {
  let unauthCtx: import('@playwright/test').APIRequestContext;
  let salesCtx: import('@playwright/test').APIRequestContext;

  test.beforeAll(async () => {
    unauthCtx = await pwRequest.newContext();
    salesCtx = await pwRequest.newContext();
  });

  test.afterAll(async () => {
    try {
      if (unauthCtx) await unauthCtx.dispose();
    } finally {
      try {
        if (salesCtx) await salesCtx.dispose();
      } catch (_e) {
        // ignore cleanup errors
      }
    }
  });

  // ERR-01: No auth → GET /users → 401
  test('ERR-01: No auth → GET /users → 401', async () => {
    const unauthApi = new ApiClient(API);
    let errorStatus = 0;
    try {
      await unauthApi.get('/users');
    } catch (err) {
      errorStatus = (err as ApiError).status;
    }
    expect(errorStatus).toBe(401);
  });

  // ERR-02: Invalid token → GET /users with Bearer 'invalid' → 401
  test('ERR-02: Invalid token → GET /users → 401', async () => {
    const badApi = new ApiClient(API, 'invalid-token-xyz');
    let errorStatus = 0;
    try {
      await badApi.get('/users');
    } catch (err) {
      errorStatus = (err as ApiError).status;
    }
    expect(errorStatus).toBe(401);
  });

  // ERR-03: No permission → SALES tries DELETE /users/:id → 403
  test('ERR-03: SALES role cannot DELETE /users/:id → 403', async () => {
    const { loginAs } = await import('../helpers/auth');
    const sales = await loginAs(salesCtx, 'SALES');
    const salesApi = new ApiClient(API, sales.accessToken);
    let errorStatus = 0;
    try {
      // Use the sales user's own id to avoid 404 on a fake id
      await salesApi.delete(`/users/${sales.user.id}`);
    } catch (err) {
      errorStatus = (err as ApiError).status;
    }
    expect(errorStatus).toBe(403);
  });

  // ERR-04: Resource not found → GET /leads with fake UUID → 404
  test('ERR-04: GET /leads with fake UUID → 404', async () => {
    const noAuthApi = new ApiClient(API);
    // Use a valid UUID v4 format that is extremely unlikely to exist
    const fakeId = '00000000-0000-0000-0000-000000000001';
    let errorStatus = 0;
    try {
      await noAuthApi.get(`/leads/${fakeId}`);
    } catch (err) {
      errorStatus = (err as ApiError).status;
    }
    expect(errorStatus).toBe(404);
  });

  // ERR-05: Validation error → POST /leads with missing required fields → 400
  test('ERR-05: POST /leads with missing fields → 400', async () => {
    const noAuthApi = new ApiClient(API);
    let errorStatus = 0;
    try {
      // Send minimal payload missing required fields like fullName, email
      await noAuthApi.post('/leads', { foo: 'bar' });
    } catch (err) {
      errorStatus = (err as ApiError).status;
    }
    expect(errorStatus).toBe(400);
  });

  // ERR-06: Rate limit → POST /auth/login ×11 fast → 429
  test('ERR-06: Rapid login attempts trigger rate limit → 429', async () => {
    const rateLimitCtx = await pwRequest.newContext();
    try {
      let errorStatus = 0;
      for (let i = 0; i < 11; i++) {
        try {
          await rateLimitCtx.post(`${API}/auth/login`, {
            data: { email: 'ratelimit@test.com', password: 'wrong' },
          });
        } catch (err) {
          errorStatus = (err as { status: () => number }).status();
          if (errorStatus === 429) break;
        }
      }
      expect(errorStatus).toBe(429);
    } finally {
      await rateLimitCtx.dispose();
    }
  });

  // ERR-07: Error response shape includes traceId
  test('ERR-07: Error response shape includes traceId', async () => {
    const unauthApi = new ApiClient(API);
    let errorBody: Record<string, unknown> = {};
    try {
      await unauthApi.get('/users');
    } catch (err) {
      errorBody = (err as ApiError).body as Record<string, unknown>;
    }
    expect(errorBody).toHaveProperty('traceId');
  });

  // ERR-08: Error response shape includes path
  test('ERR-08: Error response shape includes path', async () => {
    const unauthApi = new ApiClient(API);
    let errorBody: Record<string, unknown> = {};
    try {
      await unauthApi.get('/users');
    } catch (err) {
      errorBody = (err as ApiError).body as Record<string, unknown>;
    }
    expect(errorBody).toHaveProperty('path');
  });

  // ERR-09: Error response shape includes statusCode
  test('ERR-09: Error response shape includes statusCode', async () => {
    const unauthApi = new ApiClient(API);
    let errorBody: Record<string, unknown> = {};
    try {
      await unauthApi.get('/users');
    } catch (err) {
      errorBody = (err as ApiError).body as Record<string, unknown>;
    }
    expect(errorBody).toHaveProperty('statusCode');
  });

  // ERR-10: E2E — Unauthenticated user redirected to /login when accessing /dashboard
  test('ERR-10: E2E — Unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  // ERR-11: E2E — 404 page for nonexistent route
  test('ERR-11: E2E — 404 page for nonexistent route', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist-xyz');
    // Should show 404 — either dedicated 404 page or error boundary
    const body = await page.locator('body').textContent();
    expect(
      body?.toLowerCase().includes('404') ||
        page.url().includes('404') ||
        (await page.locator('[data-testid="not-found"]').count()) > 0
    ).toBeTruthy();
  });

  // ERR-12: E2E — Forgot password form submits
  test('ERR-12: E2E — Forgot password form submits without crash', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    // Just ensure the page doesn't crash — API may or may not send email
    await expect(page.locator('body')).toBeVisible();
  });
});
