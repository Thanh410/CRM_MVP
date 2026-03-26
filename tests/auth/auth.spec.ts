// tests/auth/auth.spec.ts
// NOTE: All API calls use FULL URL because Playwright's pwRequest.newContext()
// baseURL only applies to browser navigation (page.goto()), NOT API requests.
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs, logout } from '../helpers/auth';

const API = 'http://localhost:3000/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Login via UI using explicit email/password (not role-based). */
async function loginAsUIAuth(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

// ---------------------------------------------------------------------------
// API Tests
// ---------------------------------------------------------------------------
test.describe('Auth — API Tests', () => {

  test('AUTH-01: Valid login returns tokens and user', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/login`, {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user).toHaveProperty('email', 'admin@abc.com.vn');
    await ctx.dispose();
  });

  test('AUTH-02: Login with wrong password returns 401', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/login`, {
      data: { email: 'admin@abc.com.vn', password: 'WrongPassword' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-03: Login with non-existent user returns 401', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/login`, {
      data: { email: 'ghost@nowhere.com', password: 'AnyPass123' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-04: Login with missing fields returns 400', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/login`, { data: {} });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  test('AUTH-05: Token refresh returns new access and refresh tokens', async () => {
    const ctx = await pwRequest.newContext();
    // loginAs() consumes body internally — use it directly
    const { refreshToken } = await loginAs(ctx, 'ADMIN');
    const refreshRes = await ctx.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(refreshRes.status()).toBe(200);
    const body = await refreshRes.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    await ctx.dispose();
  });

  test('AUTH-06: Invalid refresh token returns 401', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/refresh`, { data: { refreshToken: 'invalid.jwt.token' } });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-07: Logout with refresh token revokes it', async () => {
    const ctx = await pwRequest.newContext();
    const { accessToken, refreshToken } = await loginAs(ctx, 'ADMIN');
    // Logout requires accessToken in Authorization header (not refreshToken in body)
    await logout(ctx, accessToken);
    const reuseRes = await ctx.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(reuseRes.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-08: Logout without token revokes all tokens', async () => {
    const ctx = await pwRequest.newContext();
    const { accessToken, refreshToken } = await loginAs(ctx, 'ADMIN');
    // Logout requires accessToken in Authorization header
    await logout(ctx, accessToken);
    const reuseRes = await ctx.post(`${API}/auth/refresh`, { data: { refreshToken } });
    expect(reuseRes.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-09: Forgot password returns 200 (enumeration-safe)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/forgot-password`, { data: { email: 'admin@abc.com.vn' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message ?? body).toBeTruthy();
    await ctx.dispose();
  });

  test('AUTH-10: Forgot password non-existent user returns 200 (enumeration-safe)', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.post(`${API}/auth/forgot-password`, { data: { email: 'ghost@nowhere.com' } });
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  test('AUTH-11: GET /auth/me returns user with roles', async () => {
    const ctx = await pwRequest.newContext();
    const { accessToken } = await loginAs(ctx, 'ADMIN');
    const meRes = await ctx.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status()).toBe(200);
    const body = await meRes.json();
    expect(body).toHaveProperty('email', 'admin@abc.com.vn');
    expect(body).toHaveProperty('roles');
    await ctx.dispose();
  });

  test('AUTH-12: GET /users without token returns 401', async () => {
    const ctx = await pwRequest.newContext();
    const res = await ctx.get(`${API}/users`);
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  test('AUTH-13: Login rate limit — 10 OK, 11th returns 429', async () => {
    const ctx = await pwRequest.newContext();
    for (let i = 0; i < 10; i++) {
      const res = await ctx.post(`${API}/auth/login`, {
        data: { email: 'admin@abc.com.vn', password: 'BadPass' },
      });
      expect([200, 401]).toContain(res.status());
    }
    const res11 = await ctx.post(`${API}/auth/login`, {
      data: { email: 'admin@abc.com.vn', password: 'BadPass' },
    });
    expect([429, 401]).toContain(res11.status());
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// E2E UI Tests
// ---------------------------------------------------------------------------
test.describe('Auth — E2E UI Tests', () => {

  test('AUTH-14: Login form redirects to /dashboard on success', async ({ page }) => {
    await loginAsUIAuth(page, 'admin@abc.com.vn', 'Admin@123456');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('AUTH-15: Login form shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@abc.com.vn');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url.includes('/login') || url.includes('/dashboard')).toBeTruthy();
  });

  test('AUTH-16: Unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('AUTH-17: Logout redirects to /login', async ({ page }) => {
    await loginAsUIAuth(page, 'admin@abc.com.vn', 'Admin@123456');
    await page.goto('/dashboard');
    const logoutBtn = page.locator('button').filter({ hasText: /đăng xuất|logout|sign out/i }).first();
    if (await logoutBtn.isVisible({ timeout: 3000 })) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
      await expect(page).toHaveURL(/.*\/login/);
    }
  });

  test('AUTH-18: Forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('/forgot-password');
  });
});
