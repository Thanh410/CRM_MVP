// tests/helpers/auth.ts
// NOTE: All API calls use FULL URL because Playwright's pwRequest.newContext()
// baseURL only applies to browser navigation (page.goto()), NOT API requests.
import type { APIRequestContext } from '@playwright/test';

const API_URL = 'http://localhost:3000/api';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES';

// Hardcoded demo accounts — matches db/seed.ts credentials
const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  SUPER_ADMIN: { email: 'superadmin@abc.com.vn', password: 'Admin@123456' },
  ADMIN:       { email: 'admin@abc.com.vn',       password: 'Admin@123456' },
  MANAGER:     { email: 'manager.sales@abc.com.vn', password: 'Admin@123456' },
  SALES:       { email: 'sales@abc.com.vn',       password: 'Sales@123456' },
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    orgId: string;
    roles: string[];
    permissions: string[];
  };
}

export async function loginAs(request: APIRequestContext, role: Role): Promise<AuthTokens> {
  const { email, password } = DEMO_ACCOUNTS[role];
  const res = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (res.status() !== 200) {
    throw new Error(`Login as ${role} failed: ${res.status()} ${await res.text()}`);
  }
  // Body consumed here — caller MUST NOT call res.json() again.
  return res.json() as Promise<AuthTokens>;
}

export async function loginAsUI(page: import('@playwright/test').Page, role: Role) {
  const { email, password } = DEMO_ACCOUNTS[role];
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

export async function logout(request: APIRequestContext, accessToken: string) {
  await request.post(`${API_URL}/auth/logout`, {
    data: {},
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
