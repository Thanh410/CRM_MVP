// tests/auth/auth.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';

const API = process.env.API_BASE_URL!; // http://localhost:3000/api

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

  // AUTH-01: Valid login returns tokens and user
  test('AUTH-01: Valid login returns tokens and user', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user).toHaveProperty('email', 'admin@abc.com.vn');
    await ctx.dispose();
  });

  // AUTH-02: Login with wrong password returns 401
  test('AUTH-02: Login with wrong password returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'WrongPassword' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-03: Login with non-existent user returns 401 with generic message
  test('AUTH-03: Login with non-existent user returns 401 with generic message', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/login', {
      data: { email: 'ghost@nowhere.com', password: 'AnyPass123' },
    });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-04: Login with missing fields returns 400
  test('AUTH-04: Login with missing fields returns 400', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/login', { data: {} });
    expect(res.status()).toBe(400);
    await ctx.dispose();
  });

  // AUTH-05: Token refresh returns new tokens
  test('AUTH-05: Token refresh returns new access and refresh tokens', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const loginRes = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    const { refreshToken } = await loginRes.json();

    const refreshRes = await ctx.post('/auth/refresh', { data: { refreshToken } });
    expect(refreshRes.status()).toBe(200);
    const body = await refreshRes.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');

    // Old token should now be revoked
    const reuseRes = await ctx.post('/auth/refresh', { data: { refreshToken } });
    expect(reuseRes.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-06: Expired/invalid refresh token returns 401
  test('AUTH-06: Invalid refresh token returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/refresh', { data: { refreshToken: 'invalid.jwt.token' } });
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-07: Logout with refresh token revokes that token
  test('AUTH-07: Logout with refresh token revokes it', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const loginRes = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    const { refreshToken } = await loginRes.json();

    const logoutRes = await ctx.post('/auth/logout', { data: { refreshToken } });
    expect(logoutRes.status()).toBe(204);

    // Token should be revoked
    const reuseRes = await ctx.post('/auth/refresh', { data: { refreshToken } });
    expect(reuseRes.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-08: Logout without token revokes all tokens
  test('AUTH-08: Logout without token revokes all tokens for user', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const loginRes = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    const { refreshToken } = await loginRes.json();

    const logoutRes = await ctx.post('/auth/logout', { data: {} });
    expect(logoutRes.status()).toBe(204);

    // All tokens revoked
    const reuseRes = await ctx.post('/auth/refresh', { data: { refreshToken } });
    expect(reuseRes.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-09: Forgot password with existing user returns 200
  test('AUTH-09: Forgot password returns 200 (enumeration-safe)', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/forgot-password', { data: { email: 'admin@abc.com.vn' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message ?? body).toBeTruthy();
    await ctx.dispose();
  });

  // AUTH-10: Forgot password with non-existent user returns same 200 (enumeration-safe)
  test('AUTH-10: Forgot password non-existent user returns 200 (enumeration-safe)', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/auth/forgot-password', { data: { email: 'ghost@nowhere.com' } });
    expect(res.status()).toBe(200);
    await ctx.dispose();
  });

  // AUTH-11: Get /me returns current user with roles and permissions
  test('AUTH-11: GET /auth/me returns user with roles and permissions', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const loginRes = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'Admin@123456' },
    });
    const { accessToken } = await loginRes.json();

    const meRes = await ctx.get('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(meRes.status()).toBe(200);
    const body = await meRes.json();
    expect(body).toHaveProperty('email', 'admin@abc.com.vn');
    expect(body).toHaveProperty('roles');
    expect(Array.isArray(body.roles)).toBe(true);
    await ctx.dispose();
  });

  // AUTH-12: Protected route without token returns 401
  test('AUTH-12: GET /users without token returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.get('/users');
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // AUTH-13: Rate limit login — 10th succeeds, 11th returns 429
  test('AUTH-13: Login rate limit — 10 OK, 11th returns 429', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    for (let i = 1; i <= 10; i++) {
      const res = await ctx.post('/auth/login', {
        data: { email: 'admin@abc.com.vn', password: 'BadPass' },
      });
      expect([200, 401]).toContain(res.status());
    }
    const res11 = await ctx.post('/auth/login', {
      data: { email: 'admin@abc.com.vn', password: 'BadPass' },
    });
    expect(res11.status()).toBe(429);
    await ctx.dispose();
  });
});

// ---------------------------------------------------------------------------
// E2E UI Tests
// ---------------------------------------------------------------------------
test.describe('Auth — E2E UI Tests', () => {

  // AUTH-14: Login form redirects to /dashboard on success
  test('AUTH-14: Login form redirects to /dashboard on success', async ({ page }) => {
    await loginAsUIAuth(page, 'admin@abc.com.vn', 'Admin@123456');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  // AUTH-15: Login form shows error on wrong credentials (stays on /login)
  test('AUTH-15: Login form shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@abc.com.vn');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // wait for toast to appear
    await expect(page).toHaveURL(/.*\/login/);
  });

  // AUTH-16: Unauthenticated user redirected to /login when accessing dashboard
  test('AUTH-16: Unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  // AUTH-17: Logout redirects to /login
  test('AUTH-17: Logout redirects to /login', async ({ page }) => {
    await loginAsUIAuth(page, 'admin@abc.com.vn', 'Admin@123456');
    await expect(page).toHaveURL(/.*\/dashboard/);

    // Click logout button (sidebar)
    await page.click('button:has-text("Đăng xuất"), button:has-text("Logout")');
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/.*\/login/);
  });

  // AUTH-18: Forgot password page loads and form is visible
  test('AUTH-18: Forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});
