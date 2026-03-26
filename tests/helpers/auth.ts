// tests/helpers/auth.ts
import { APIRequestContext } from '@playwright/test';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES';

const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  SUPER_ADMIN: { email: process.env.DEMO_SUPERADMIN_EMAIL!, password: process.env.DEMO_SUPERADMIN_PASSWORD! },
  ADMIN:       { email: process.env.DEMO_ADMIN_EMAIL!,        password: process.env.DEMO_ADMIN_PASSWORD! },
  MANAGER:     { email: process.env.DEMO_MANAGER_EMAIL!,      password: process.env.DEMO_MANAGER_PASSWORD! },
  SALES:       { email: process.env.DEMO_SALES_EMAIL!,         password: process.env.DEMO_SALES_PASSWORD! },
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
  const res = await request.post('/api/auth/login', {
    data: { email, password },
  });
  if (res.status() !== 200) {
    throw new Error(`Login as ${role} failed: ${res.status()} ${await res.text()}`);
  }
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

export async function logout(request: APIRequestContext, refreshToken: string) {
  await request.post('/api/auth/logout', {
    data: { refreshToken },
  });
}
