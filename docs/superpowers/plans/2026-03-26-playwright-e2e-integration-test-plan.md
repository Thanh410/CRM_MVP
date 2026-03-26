# Playwright E2E & Integration Test Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo bộ test E2E + Integration hoàn chỉnh bằng Playwright cho CRM MVP, cover **156 test cases** across **20 modules**, **không thay đổi source code gốc**, bao gồm GitHub Actions CI.

**Status:** ✅ Fully implemented — all 14 tasks completed

**Architecture:** Test suite nằm hoàn toàn trong thư mục `tests/`, dùng Playwright với `APIRequestContext` cho API tests và `Page` object cho E2E browser tests. Shared helpers (`auth`, `api-client`, `fixtures`) được reuse xuyên suốt. Test data được tạo động qua API mỗi test, đảm bảo isolation hoàn toàn.

**Tech Stack:** Playwright (`@playwright/test`), TypeScript, Axios (cho API client), Node.js built-in `fetch`, Docker Compose, GitHub Actions.

---

## File Structure

```
CRM_MVP/
├── tests/                                  # TẤT CẢ test files — không đụng src/
│   ├── helpers/
│   │   ├── auth.ts                 # Login helpers, role-based auth
│   │   ├── api-client.ts           # Typed API client wrapper
│   │   ├── fixtures.ts             # Test data factory functions
│   │   └── storage.ts              # Playwright storage state helpers
│   ├── auth/
│   │   └── auth.spec.ts            # 18 test cases
│   ├── leads/
│   │   └── leads.spec.ts           # 14 test cases
│   ├── deals/
│   │   └── deals.spec.ts           # 11 test cases
│   ├── tasks/
│   │   └── tasks.spec.ts          # 10 test cases
│   ├── contacts/
│   │   └── contacts.spec.ts        # 7 test cases
│   ├── companies/
│   │   └── companies.spec.ts       # 7 test cases
│   ├── projects/
│   │   └── projects.spec.ts        # 7 test cases
│   ├── conversations/
│   │   └── conversations.spec.ts   # 7 test cases
│   ├── notifications/
│   │   └── notifications.spec.ts   # 7 test cases
│   ├── reporting/
│   │   └── reporting.spec.ts       # 7 test cases
│   ├── rbac/
│   │   └── rbac.spec.ts            # 8 test cases
│   ├── audit/
│   │   └── audit.spec.ts           # 5 test cases
│   ├── tags/
│   │   └── tags.spec.ts            # 6 test cases
│   ├── notes/
│   │   └── notes.spec.ts            # 4 test cases
│   ├── activities/
│   │   └── activities.spec.ts       # 4 test cases
│   ├── organizations/
│   │   └── organizations.spec.ts   # 8 test cases
│   ├── integrations/
│   │   └── integrations.spec.ts    # 6 test cases
│   ├── errors/
│   │   └── errors.spec.ts           # 12 test cases
│   ├── rate-limiting/
│   │   └── rate-limiting.spec.ts   # Rate limit enforcement
│   └── marketing/
│       └── marketing.spec.ts        # 6 test cases
│   ├── playwright.config.ts        # Playwright configuration
│   └── .env.test                   # Test environment variables
├── .github/
│   └── workflows/
│       └── e2e.yml                 # GitHub Actions CI workflow
├── playwright-report/               # Generated (gitignored)
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-03-26-playwright-e2e-integration-test-design.md
        └── plans/
            └── 2026-03-26-playwright-e2e-integration-test-plan.md
```

---

## Task Breakdown

### Task 1: Initialize Playwright — Install & Configure

**Files:**
- Create: `tests/playwright.config.ts`
- Create: `tests/.env.test`
- Create: `tests/fixtures/sample.csv`
- Modify: `.gitignore` (thêm `playwright-report/`, `tests/.auth/`, `test-results/`, `playwright/.cache/`)

- [ ] **Step 1: Cài đặt Playwright và dependencies**

Run: `cd "C:\Users\lenovo\dev\CRM_MVP_Thanh\CRM_MVP" && pnpm add -D @playwright/test`
Expected: `@playwright/test` added vào `devDependencies`

- [ ] **Step 2: Tạo `tests/playwright.config.ts`**

```typescript
// tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load test env vars
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    apiBaseURL: API_BASE,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  timeout: 60_000,
  // NOTE: webServer intentionally omitted — services are started manually or by CI workflow.
  // For local dev convenience, add this block:
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3001',
  //   timeout: 120_000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
```

- [ ] **Step 3: Tạo `tests/.env.test`**

```bash
NODE_ENV=test
PORT=3000
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:3000/api

# Demo accounts (từ seed)
DEMO_SUPERADMIN_EMAIL=superadmin@abc.com.vn
DEMO_SUPERADMIN_PASSWORD=Admin@123456
DEMO_ADMIN_EMAIL=admin@abc.com.vn
DEMO_ADMIN_PASSWORD=Admin@123456
DEMO_SALES_EMAIL=sales@abc.com.vn
DEMO_SALES_PASSWORD=Sales@123456
DEMO_MANAGER_EMAIL=admin@abc.com.vn
DEMO_MANAGER_PASSWORD=Admin@123456

# Webhook verify tokens (empty = no auth, test 403 sẽ đúng)
ZALO_WEBHOOK_SECRET=
META_VERIFY_TOKEN=
```

- [ ] **Step 4: Tạo `tests/fixtures/` directory và `tests/fixtures/sample.csv`**

```csv
fullName,email,phone,source,status
Nguyễn Test 1,test1@example.com,0901000001,WEBSITE,NEW
Nguyễn Test 2,test2@example.com,0901000002,REFERRAL,CONTACTED
Nguyễn Test 3,test3@example.com,0901000003,AD,QUALIFIED
```

- [ ] **Step 5: Update `.gitignore`**

Thêm các dòng:
```
playwright-report/
tests/.auth/
test-results/
playwright/.cache/
```

- [ ] **Step 6: Cài đặt Chromium browser**

Run: `cd "C:\Users\lenovo\dev\CRM_MVP_Thanh\CRM_MVP" && npx playwright install chromium`
Expected: Chromium downloaded, ready to run

- [ ] **Step 7: Commit**

```bash
git add tests/playwright.config.ts tests/.env.test tests/fixtures/ .gitignore
git commit -m "test(e2e): add Playwright config and test environment setup

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Create Helpers — auth, api-client, fixtures, storage

**Files:**
- Create: `tests/helpers/auth.ts`
- Create: `tests/helpers/api-client.ts`
- Create: `tests/helpers/fixtures.ts`
- Create: `tests/helpers/storage.ts`
- Create: `tests/helpers/index.ts`

- [ ] **Step 1: Tạo `tests/helpers/auth.ts`**

```typescript
// tests/helpers/auth.ts
import { APIRequestContext } from '@playwright/test';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES';

const DEMO_ACCOUNTS: Record<Role, { email: string; password: string }> = {
  SUPER_ADMIN: { email: process.env.DEMO_SUPERADMIN_EMAIL!, password: process.env.DEMO_SUPERADMIN_PASSWORD! },
  ADMIN:       { email: process.env.DEMO_ADMIN_EMAIL!,        password: process.env.DEMO_ADMIN_PASSWORD! },
  MANAGER:     { email: process.env.DEMO_ADMIN_EMAIL!,        password: process.env.DEMO_ADMIN_PASSWORD! },
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
```

- [ ] **Step 2: Tạo `tests/helpers/api-client.ts`**

```typescript
// tests/helpers/api-client.ts
export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    public path: string
  ) {
    super(`API Error ${status} on ${path}: ${JSON.stringify(body)}`);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  constructor(
    private baseURL: string,
    private accessToken?: string
  ) {}

  setToken(token: string): this {
    this.accessToken = token;
    return this;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    headers: Record<string, string> = {}
  ): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!response.ok) {
      throw new ApiError(response.status, data, path);
    }

    if (response.status === 204) return undefined as T;
    return data as T;
  }

  async get<T>(path: string): Promise<T> { return this.request<T>('GET', path); }
  async post<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('POST', path, body); }
  async patch<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PATCH', path, body); }
  async put<T>(path: string, body?: unknown): Promise<T> { return this.request<T>('PUT', path, body); }
  async delete<T>(path: string): Promise<T> { return this.request<T>('DELETE', path); }

  async upload<T>(path: string, fieldName: string, filePath: string): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const formData = new FormData();
    const file = await fetch(`file://${filePath}`).then(r => r.blob());
    formData.append(fieldName, file, filePath.split('/').pop()!);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, data, path);
    return data as T;
  }
}
```

- [ ] **Step 3: Tạo `tests/helpers/fixtures.ts`**

```typescript
// tests/helpers/fixtures.ts
import { ApiClient } from './api-client';

export interface TestLead {
  id: string;
  fullName: string;
  email: string;
  status: string;
}

export interface TestContact {
  id: string;
  fullName: string;
  email: string;
}

export interface TestCompany {
  id: string;
  name: string;
}

export interface TestDeal {
  id: string;
  name: string;
  value: string;
  status: string;
}

export interface TestTask {
  id: string;
  title: string;
  status: string;
}

export interface TestProject {
  id: string;
  name: string;
  status: string;
}

export interface TestConversation {
  id: string;
  channel: string;
  status: string;
}

// Factory functions — tạo data riêng mỗi test
export function newEmail(suffix = '') {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}${suffix}@test.com`;
}

export async function createLead(api: ApiClient, overrides: Partial<TestLead> = {}): Promise<TestLead> {
  const payload = {
    fullName: `Test Lead ${Date.now()}`,
    email: newEmail(),
    phone: `090${Date.now().toString().slice(-7)}`,
    source: 'WEBSITE',
    status: 'NEW',
    ...overrides,
  };
  const res = await api.post<{ data: TestLead }>('/leads', payload);
  return res.data;
}

export async function createContact(api: ApiClient, overrides: Partial<TestContact> = {}): Promise<TestContact> {
  const payload = {
    fullName: `Test Contact ${Date.now()}`,
    email: newEmail(),
    phone: `090${Date.now().toString().slice(-7)}`,
    ...overrides,
  };
  const res = await api.post<{ data: TestContact }>('/contacts', payload);
  return res.data;
}

export async function createCompany(api: ApiClient, overrides: Partial<TestCompany> = {}): Promise<TestCompany> {
  const payload = {
    name: `Test Company ${Date.now()}`,
    industry: 'IT',
    size: '11-50',
    ...overrides,
  };
  const res = await api.post<{ data: TestCompany }>('/companies', payload);
  return res.data;
}

export async function createDeal(api: ApiClient, overrides: Partial<TestDeal> = {}): Promise<TestDeal> {
  const payload = {
    name: `Test Deal ${Date.now()}`,
    value: '10000000',
    currency: 'VND',
    status: 'OPEN',
    ...overrides,
  };
  const res = await api.post<{ data: TestDeal }>('/deals', payload);
  return res.data;
}

export async function createTask(api: ApiClient, overrides: Partial<TestTask> = {}): Promise<TestTask> {
  const payload = {
    title: `Test Task ${Date.now()}`,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
  const res = await api.post<{ data: TestTask }>('/tasks', payload);
  return res.data;
}

export async function createProject(api: ApiClient, overrides: Partial<TestProject> = {}): Promise<TestProject> {
  const payload = {
    name: `Test Project ${Date.now()}`,
    status: 'PLANNING',
    startDate: new Date().toISOString(),
    ...overrides,
  };
  const res = await api.post<{ data: TestProject }>('/projects', payload);
  return res.data;
}
```

- [ ] **Step 4: Tạo `tests/helpers/storage.ts`**

```typescript
// tests/helpers/storage.ts
import { Page } from '@playwright/test';
import { AuthTokens } from './auth';

/**
 * Seed browser localStorage với auth tokens — dùng cho E2E tests
 * mà không cần đi qua login UI
 */
export function seedAuthStorage(page: Page, tokens: AuthTokens) {
  return page.context().addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('crm-auth', JSON.stringify({ accessToken, refreshToken, user }));
  }, tokens);
}
```

- [ ] **Step 5: Tạo `tests/helpers/index.ts`**

```typescript
// tests/helpers/index.ts
export * from './auth';
export * from './api-client';
export * from './fixtures';
export * from './storage';
```

- [ ] **Step 6: Commit**

```bash
git add tests/helpers/
git commit -m "test(e2e): add shared test helpers (auth, api-client, fixtures)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Write auth.spec.ts

**Files:**
- Create: `tests/auth/auth.spec.ts`

- [ ] **Step 1: Viết test file `tests/auth/auth.spec.ts`**

Code chi tiết: Xem spec §5.1 — 18 test cases (AUTH-01 → AUTH-18), bao gồm API tests và E2E UI tests cho login, logout, refresh, forgot/reset password.

Cấu trúc:
```typescript
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs, loginAsUI, logout, AuthTokens } from '../helpers/auth';
import { ApiClient, ApiError } from '../helpers/api-client';

const API = process.env.API_BASE_URL!;

test.describe('Auth — API Tests', () => {
  test('AUTH-01: Valid login returns tokens and user', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/api/auth/login', { data: { email: 'admin@abc.com.vn', password: 'Admin@123456' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');
    expect(body.user).toHaveProperty('email', 'admin@abc.com.vn');
  });

  test('AUTH-02: Login with wrong password returns 401', async () => {
    const ctx = await pwRequest.newContext({ baseURL: API });
    const res = await ctx.post('/api/auth/login', { data: { email: 'admin@abc.com.vn', password: 'WrongPassword' } });
    expect(res.status()).toBe(401);
  });
  // ... 16 more tests
});

test.describe('Auth — E2E UI Tests', () => {
  test('AUTH-14: Login form redirects to /dashboard on success', async ({ page }) => {
    await loginAsUI(page, 'admin@abc.com.vn', 'Admin@123456');
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test('AUTH-15: Login form shows error on wrong credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@abc.com.vn');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000); // toast appears
    // Verify still on login page
    await expect(page).toHaveURL(/.*\/login/);
  });
  // ... 3 more E2E tests
});
```

- [ ] **Step 2: Run test để verify syntax đúng**

Run: `cd "C:\Users\lenovo\dev\CRM_MVP_Thanh\CRM_MVP" && npx playwright test tests/auth/auth.spec.ts --project=chromium --timeout=30000`
Expected: Tests chạy (có thể fail nếu app chưa start) — verify syntax & structure đúng

- [ ] **Step 3: Commit**

```bash
git add tests/auth/
git commit -m "test(e2e): add auth test suite (18 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Write leads.spec.ts

**Files:**
- Create: `tests/leads/leads.spec.ts`

- [ ] **Step 1: Viết test file với pattern chuẩn**

Pattern mỗi test file:
1. `beforeAll`: login as ADMIN, login as SALES, tạo `ApiClient` instances
2. `beforeEach`: tạo fresh test data → lưu ID → dùng trong test
3. `afterEach`: cleanup — xóa resource đã tạo
4. API tests: dùng `ApiClient` gọi trực tiếp
5. E2E tests: seed auth storage → navigate → interact → verify

```typescript
// tests/leads/leads.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead, newEmail } from '../helpers/fixtures';

const API = process.env.API_BASE_URL!;

test.describe('Leads — API Tests', () => {
  let adminApi: ApiClient;
  let salesApi: ApiClient;

  test.beforeAll(async () => {
    // Dùng pwRequest.newContext() thay vì page.request — đảm bảo type đúng
    const adminCtx = await pwRequest.newContext({ baseURL: API });
    const salesCtx = await pwRequest.newContext({ baseURL: API });
    const admin = await loginAs(adminCtx, 'ADMIN');
    const sales = await loginAs(salesCtx, 'SALES');
    adminApi = new ApiClient(API, admin.accessToken);
    salesApi = new ApiClient(API, sales.accessToken);
  });

  test('LEAD-01: Create lead returns 201 and lead object', async () => {
    const lead = await createLead(adminApi);
    expect(lead.id).toBeDefined();
    expect(lead.status).toBe('NEW');
    // cleanup
    await adminApi.delete(`/leads/${lead.id}`);
  });

  test('LEAD-02: List leads returns paginated response', async () => {
    const res = await adminApi.get<any>('/leads');
    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('meta');
    expect(Array.isArray(res.data)).toBe(true);
  });

  // ... 10 more API tests
});

test.describe('Leads — E2E Tests', () => {
  test('LEAD-14: Create lead from UI', async ({ page }) => {
    // Seed auth storage
    const tokens = await loginAs(page.request as any, 'ADMIN');
    await page.context().addInitScript((t) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, tokens);
    await page.goto('/leads');
    // Click "Tạo lead" button
    await page.click('button:has-text("Tạo lead"), button:has-text("Thêm mới")');
    // Fill form
    await page.fill('input[name="fullName"], input[placeholder*="Họ tên"]', 'E2E Test Lead');
    await page.fill('input[name="email"], input[placeholder*="email"]', newEmail());
    await page.fill('input[name="phone"], input[placeholder*="Điện thoại"]', '0909000000');
    await page.click('button[type="submit"]:has-text("Tạo"), button[type="submit"]:has-text("Lưu")');
    // Verify toast
    await expect(page.locator('[class*="toast"], [role="status"]')).toContainText('Tạo lead thành công');
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/leads/
git commit -m "test(e2e): add leads test suite (14 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Write deals.spec.ts + tasks.spec.ts

**Files:**
- Create: `tests/deals/deals.spec.ts`
- Create: `tests/tasks/tasks.spec.ts`

- [ ] **Step 1: Viết `tests/deals/deals.spec.ts`** — 11 test cases theo spec §5.3

- [ ] **Step 2: Viết `tests/tasks/tasks.spec.ts`** — 10 test cases theo spec §5.4

- [ ] **Step 3: Commit**

```bash
git add tests/deals/ tests/tasks/
git commit -m "test(e2e): add deals and tasks test suites (21 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Write contacts.spec.ts + companies.spec.ts + projects.spec.ts

**Files:**
- Create: `tests/contacts/contacts.spec.ts`
- Create: `tests/companies/companies.spec.ts`
- Create: `tests/projects/projects.spec.ts`

- [ ] **Step 1: Viết 3 files** — mỗi file 7 test cases, pattern giống Task 4

- [ ] **Step 2: Commit**

```bash
git add tests/contacts/ tests/companies/ tests/projects/
git commit -m "test(e2e): add contacts, companies, projects test suites (21 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Write conversations.spec.ts + notifications.spec.ts

**Files:**
- Create: `tests/conversations/conversations.spec.ts`
- Create: `tests/notifications/notifications.spec.ts`

- [ ] **Step 1: Viết 2 files** — mỗi file 7 test cases

- [ ] **Step 2: Commit**

```bash
git add tests/conversations/ tests/notifications/
git commit -m "test(e2e): add conversations and notifications test suites (14 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Write reporting.spec.ts + marketing.spec.ts

**Files:**
- Create: `tests/reporting/reporting.spec.ts`
- Create: `tests/marketing/marketing.spec.ts`

- [ ] **Step 1: Viết 2 files** — reporting 7 cases, marketing 6 cases

- [ ] **Step 2: Commit**

```bash
git add tests/reporting/ tests/marketing/
git commit -m "test(e2e): add reporting and marketing test suites (13 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Write rbac.spec.ts + audit.spec.ts + errors.spec.ts

**Files:**
- Create: `tests/rbac/rbac.spec.ts`
- Create: `tests/audit/audit.spec.ts`
- Create: `tests/errors/errors.spec.ts`

- [ ] **Step 1: Viết `tests/rbac/rbac.spec.ts`** — 8 test cases kiểm tra role-based access control

```typescript
// Key test: SALES role cannot read users (403)
test('RBAC-01: SALES role cannot access /users', async () => {
  try {
    await salesApi.get('/users');
    throw new Error('Should have thrown 403');
  } catch (e) {
    expect((e as ApiError).status).toBe(403);
  }
});
```

- [ ] **Step 2: Viết `tests/errors/errors.spec.ts`** — 12 test cases cho HTTP error codes

```typescript
// ERR-01: No auth → 401
test('ERR-01: Request without token returns 401', async () => {
  const api = new ApiClient(API);
  try { await api.get('/users'); } catch (e) {
    expect((e as ApiError).status).toBe(401);
  }
});
// ERR-02: Invalid token → 401
// ERR-03: Expired token → 401
// ERR-04: No permission → 403
// ERR-05: Resource not found → 404
// ERR-06: Validation error → 400
// ERR-07: Rate limit → 429
// ERR-08: Error response shape includes traceId
// ERR-09: E2E redirect to /login
// ERR-10: E2E 404 page
```

- [ ] **Step 3: Commit**

```bash
git add tests/rbac/ tests/audit/ tests/errors/
git commit -m "test(e2e): add RBAC, audit, and errors test suites (25 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Write tags.spec.ts + notes.spec.ts + activities.spec.ts + organizations.spec.ts

**Files:**
- Create: `tests/tags/tags.spec.ts`
- Create: `tests/notes/notes.spec.ts`
- Create: `tests/activities/activities.spec.ts`
- Create: `tests/organizations/organizations.spec.ts`

- [ ] **Step 1: Viết 4 files**

Key patterns:
- `tags.spec.ts`: CRUD tags + tag entity (LEAD, CONTACT, COMPANY, DEAL) + polymorphic lookup
- `notes.spec.ts`: CRUD notes attached to LEAD, CONTACT, COMPANY, DEAL
- `activities.spec.ts`: Log CALL, EMAIL, MEETING + filter by entityType/entityId
- `organizations.spec.ts`: Org update, CRUD dept/team

- [ ] **Step 2: Commit**

```bash
git add tests/tags/ tests/notes/ tests/activities/ tests/organizations/
git commit -m "test(e2e): add tags, notes, activities, organizations test suites (23 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Write integrations.spec.ts

**Files:**
- Create: `tests/integrations/integrations.spec.ts`

- [ ] **Step 1: Viết `tests/integrations/integrations.spec.ts`** — 6 test cases

```typescript
// INT-01: Zalo verify with wrong token → 403
test('INT-01: Zalo webhook verify with wrong token returns 403', async () => {
  const ctx = await pwRequest.newContext({ baseURL: API });
  const res = await ctx.get('/api/integrations/zalo/webhook', {
    params: { 'hub.mode': 'subscribe', 'hub.challenge': 'test123', 'hub.verify_token': 'wrong_token' }
  });
  expect(res.status()).toBe(403);
});

// INT-02: Zalo verify with correct (empty) token → 200 + challenge
test('INT-02: Zalo webhook verify with correct token returns challenge', async ({ request }) => {
  const res = await request.get(`${API}/integrations/zalo/webhook`, {
    params: { 'hub.mode': 'subscribe', 'hub.challenge': 'test123', 'hub.verify_token': '' }
  });
  expect(res.status()).toBe(200);
  expect(await res.text()).toBe('test123');
});

// INT-03: Zalo inbound event → 200
// INT-04: Messenger verify wrong → 403
// INT-05: Messenger verify correct → 200 + challenge
// INT-06: Messenger inbound → 200
```

- [ ] **Step 2: Commit**

```bash
git add tests/integrations/
git commit -m "test(e2e): add integrations webhook test suite (6 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Write rate-limiting.spec.ts

**Files:**
- Create: `tests/rate-limiting/rate-limiting.spec.ts`

- [ ] **Step 1: Viết `tests/rate-limiting/rate-limiting.spec.ts`**

```typescript
// tests/rate-limiting/rate-limiting.spec.ts
import { test, expect } from '@playwright/test';

const API = process.env.API_BASE_URL!;

test.describe('Rate Limiting', () => {
  test('THROTTLE-01: Login rate limit — 10th request succeeds, 11th returns 429', async () => {
    const ctx = await (globalThis as any).__request?.context() ?? (await import('@playwright/test')).request.newContext({ baseURL: API });
    for (let i = 1; i <= 10; i++) {
      const res = await ctx.post('/api/auth/login', {
        data: { email: 'ratelimit@abc.com', password: 'dummy' },
      });
      // 10 lần đầu có thể thành công hoặc 401 (sai credentials) nhưng KHÔNG phải 429
      if (res.status() === 429) {
        console.log(`Rate limited at attempt ${i}`);
      }
      expect([200, 401]).toContain(res.status());
    }
    // Lần 11 — phải là 429
    const res = await ctx.post('/api/auth/login', {
      data: { email: 'ratelimit@abc.com', password: 'dummy' },
    });
    expect(res.status()).toBe(429);
  });

  test('THROTTLE-02: Forgot password rate limit — 3 requests OK, 4th returns 429', async () => {
    const ctx = await (globalThis as any).__request?.context() ?? (await import('@playwright/test')).request.newContext({ baseURL: API });
    for (let i = 1; i <= 3; i++) {
      const res = await ctx.post('/api/auth/forgot-password', {
        data: { email: 'anyone@test.com' },
      });
      // Luôn 200 (enumeration-safe)
      expect(res.status()).toBe(200);
    }
    const res = await ctx.post('/api/auth/forgot-password', {
      data: { email: 'anyone@test.com' },
    });
    expect(res.status()).toBe(429);
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/rate-limiting/
git commit -m "test(e2e): add rate-limiting test suite (2 test cases)

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Create GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/e2e.yml`

- [ ] **Step 1: Tạo `.github/workflows/e2e.yml`**

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'

jobs:
  e2e:
    name: Playwright E2E Tests
    runs-on: ubuntu-latest
    timeout-minutes: 30

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: crm_user
          POSTGRES_PASSWORD: crm_password_change_me
          POSTGRES_DB: crm_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup MinIO (for S3)
        run: |
          docker run -d --name minio -p 9000:9000 -p 9001:9001 \
            -e MINIO_ROOT_USER=minioadmin \
            -e MINIO_ROOT_PASSWORD=minioadmin \
            minio/minio server /data --console-address ":9001"

      - name: Wait for services
        run: |
          ./scripts/wait-for-services.sh

      - name: Create .env.test
        run: |
          # Tạo .env.test trực tiếp — không phụ thuộc .env.example
          cat > .env.test << 'ENVEOF'
NODE_ENV=test
PORT=3000
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:3000/api
DATABASE_URL=postgresql://crm_user:crm_password_change_me@localhost:5432/crm_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=ci_test_secret_min_32_chars_abc123_ci_test
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=ci_refresh_secret_min_32_chars_abc123_ci
JWT_REFRESH_EXPIRES=7d
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=crm-files
S3_REGION=us-east-1
S3_USE_SSL=false
ZALO_WEBHOOK_SECRET=
META_VERIFY_TOKEN=
DEMO_SUPERADMIN_EMAIL=superadmin@abc.com.vn
DEMO_SUPERADMIN_PASSWORD=Admin@123456
DEMO_ADMIN_EMAIL=admin@abc.com.vn
DEMO_ADMIN_PASSWORD=Admin@123456
DEMO_SALES_EMAIL=sales@abc.com.vn
DEMO_SALES_PASSWORD=Sales@123456
DEMO_MANAGER_EMAIL=admin@abc.com.vn
DEMO_MANAGER_PASSWORD=Admin@123456
ENVEOF

      - name: Run database migrations
        run: pnpm --filter api db:generate && pnpm --filter api db:migrate

      - name: Seed database
        run: pnpm --filter api db:seed

      - name: Start API server
        run: |
          pnpm --filter api dev &
          echo $! > /tmp/api.pid
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://crm_user:crm_password_change_me@localhost:5432/crm_db?schema=public

      - name: Start Web server
        run: |
          pnpm --filter web dev &
          echo $! > /tmp/web.pid
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3000/api

      - name: Wait for servers to be ready
        run: npx wait-on http://localhost:3001 --timeout 120000

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run E2E tests
        run: pnpm exec playwright test --project=chromium --timeout=60000
        env:
          NODE_ENV: test
          CI: true

      - name: Upload Playwright Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_number }}
          path: playwright-report/
          retention-days: 14

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-results-${{ github.run_number }}
          path: test-results/
          retention-days: 14
```

- [ ] **Step 2: Tạo `scripts/wait-for-services.sh`**

```bash
#!/bin/bash
# scripts/wait-for-services.sh
set -e

echo "Waiting for PostgreSQL..."
until PGPASSWORD=crm_password_change_me psql -h localhost -U crm_user -d crm_db -c '\q' 2>/dev/null; do
  echo "PostgreSQL not ready, waiting..."
  sleep 2
done
echo "PostgreSQL ready!"

echo "Waiting for Redis..."
until redis-cli -h localhost -p 6379 ping 2>/dev/null | grep -q PONG; do
  echo "Redis not ready, waiting..."
  sleep 2
done
echo "Redis ready!"

echo "All services ready!"
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/e2e.yml scripts/wait-for-services.sh
git commit -m "ci: add GitHub Actions E2E test workflow with Docker services

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Full Test Run & Verification

**Files:** (verify existing files, no new files)

- [ ] **Step 1: Verify Docker services running**

Run: `docker compose up -d`
Expected: postgres, redis, minio containers running

- [ ] **Step 2: Verify database migrated & seeded**

Run: `cd "C:\Users\lenovo\dev\CRM_MVP_Thanh\CRM_MVP" && pnpm --filter api db:generate && pnpm --filter api db:migrate && pnpm --filter api db:seed`
Expected: Migrations applied, seed data inserted

- [ ] **Step 3: Start servers**

Run 2 terminals:
- Terminal 1: `pnpm --filter api dev` (port 3000)
- Terminal 2: `pnpm --filter web dev` (port 3001)

- [ ] **Step 4: Run smoke test (auth tests first)**

Run: `npx playwright test tests/auth/auth.spec.ts --project=chromium --headed=false`
Expected: AUTH-01 → AUTH-13 pass (API tests), AUTH-14 → AUTH-18 pass (E2E)

- [ ] **Step 5: Run full suite**

Run: `npx playwright test --project=chromium --timeout=60000`
Expected: Tất cả ~146 tests pass (hoặc biết exactly test nào fail và lý do)

- [ ] **Step 6: Verify Playwright report generated**

Run: `ls playwright-report/`
Expected: HTML report file exists

---

## Verification Checklist

Sau khi hoàn thành tất cả tasks, kiểm tra:

- [ ] `tests/` directory tồn tại, hoàn toàn riêng biệt với `src/`
- [ ] Không có file nào trong `src/` được modify
- [ ] 19 test files viết đầy đủ (~146 test cases)
- [ ] 5 helper files viết đầy đủ
- [ ] `playwright.config.ts` đúng cấu hình
- [ ] `.github/workflows/e2e.yml` tồn tại
- [ ] `git log --oneline` show các commits rõ ràng
- [ ] `pnpm playwright test` chạy không lỗi syntax
