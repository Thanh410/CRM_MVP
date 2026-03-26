# Playwright E2E & Integration Test Suite — Design Spec

## CRM MVP Project

**Date:** 2026-03-26
**Type:** Test Design Specification
**Status:** Draft — awaiting user review
**Rule:** **Không thay đổi source code gốc.** Tất cả test file nằm trong thư mục `tests/`, hoàn toàn isolated với `src/`.

---

## 1. Mục Tiêu & Phạm Vi

### 1.1 Mục tiêu
Viết bộ test E2E + Integration sử dụng **Playwright** để:
- Test tích hợp giữa **Next.js Frontend (port 3001)** và **NestJS Backend (port 3000)**
- Kiểm tra các luồng nghiệp vụ thực tế (login → tạo lead → chuyển deal → gửi tin nhắn inbox,...)
- Xác minh response shape, HTTP status codes, RBAC, rate limiting
- **Không modify source code gốc** — chỉ tạo file test ở thư mục riêng

### 1.2 Phạm vi
| Layer | Test gì |
|---|---|
| **API Integration** | Gọi trực tiếp REST endpoints, kiểm tra response body, status, RBAC |
| **Frontend E2E** | Điều khiển trình duyệt, fill form, click, verify UI phản hồi |
| **Error & Edge Cases** | 401, 403, 404, 400 validation, rate limit 429 |
| **Auth Flows** | Login, logout, token refresh, forgot/reset password |

### 1.3 Out of scope
- WebSocket tests (chưa implemented trong codebase)
- Unit test cho backend code (đã có Jest config sẵn)
- Performance/load testing
- File upload/download verification (chỉ verify response status)

---

## 2. Test File Structure

```
CRM_MVP/
├── tests/
│   ├── helpers/
│   │   ├── auth.ts           # Login helper, token storage, role-based login
│   │   ├── api-client.ts     # Shared API client (axios-like wrapper)
│   │   ├── fixtures.ts       # Test data fixtures (org, users, leads, deals,...)
│   │   └── database.ts       # DB setup/cleanup helpers (direct Prisma)
│   ├── auth/
│   │   └── auth.spec.ts      # Login, logout, refresh, forgot/reset, /me
│   ├── leads/
│   │   └── leads.spec.ts     # CRUD, assign, convert, import/export CSV
│   ├── contacts/
│   │   └── contacts.spec.ts  # CRUD, link to company
│   ├── companies/
│   │   └── companies.spec.ts # CRUD
│   ├── deals/
│   │   └── deals.spec.ts     # CRUD, kanban, stage moves, won/lost
│   ├── tasks/
│   │   └── tasks.spec.ts     # CRUD, kanban, status transitions, comments
│   ├── projects/
│   │   └── projects.spec.ts  # CRUD
│   ├── conversations/
│   │   └── conversations.spec.ts  # Assign, status, link, send message
│   ├── notifications/
│   │   └── notifications.spec.ts  # Read, read-all, delete
│   ├── reporting/
│   │   └── reporting.spec.ts # Dashboard, funnel, sources, timeline
│   ├── rbac/
│   │   └── rbac.spec.ts      # Role assignment, permission bypass
│   ├── audit/
│   │   └── audit.spec.ts     # Log retrieval, filters
│   ├── tags/
│   │   └── tags.spec.ts      # CRUD, tag entities, polymorphic lookup
│   ├── notes/
│   │   └── notes.spec.ts     # CRUD on all entity types
│   ├── activities/
│   │   └── activities.spec.ts # CRUD, filtering by entity
│   ├── organizations/
│   │   └── organizations.spec.ts # Org update, dept/team CRUD
│   ├── integrations/
│   │   └── integrations.spec.ts  # Zalo webhook, Messenger webhook
│   ├── errors/
│   │   └── errors.spec.ts    # 401, 403, 404, 400, 429, 500
│   ├── rate-limiting/
│   │   └── rate-limiting.spec.ts  # Throttle enforcement
│   └── playwright.config.ts  # Playwright configuration
├── playwright-report/        # Generated HTML report
└── .env.test                 # Test environment variables
```

---

## 3. Test Configuration

### 3.1 playwright.config.ts
```typescript
// tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,        // sequential vì shared DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                  // 1 worker vì DB state chia sẻ
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    apiBaseURL: process.env.API_BASE_URL ?? 'http://localhost:3000/api',
    storageState: 'tests/.auth/admin.json', // default auth state
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  timeout: 60_000,
  webServer: [
    {
      command: 'docker compose up -d',  // hoặc pnpm dev
      url: 'http://localhost:3001',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

### 3.2 .env.test
```
# Tests — không dùng .env gốc, tránh conflict
NODE_ENV=test
PORT=3000
FRONTEND_URL=http://localhost:3001
API_BASE_URL=http://localhost:3000/api

# Demo accounts từ seed
DEMO_EMAIL=superadmin@abc.com.vn
DEMO_PASSWORD=Admin@123456
ADMIN_EMAIL=admin@abc.com.vn
ADMIN_PASSWORD=Admin@123456
SALES_EMAIL=sales@abc.com.vn
SALES_PASSWORD=Sales@123456

# Rate limit test accounts
RATE_LIMIT_EMAIL=ratelimit@abc.com.vn
RATE_LIMIT_PASSWORD=Ratelimit@123456
```

---

## 4. Auth Architecture & Helpers

### 4.1 Login Strategy cho Playwright

**Cách 1 — Direct API login (khuyên dùng):**
- Mỗi test file gọi `POST /api/auth/login` để lấy token
- Lưu vào `storageState` file JSON
- Playwright dùng storageState để hydrate browser session
- **Ưu điểm:** Không phụ thuộc UI, nhanh, chính xác
- **Phù hợp:** Tất cả API integration tests và hầu hết E2E tests

**Cách 2 — Full UI login (dùng cho Auth flow tests):**
- `page.goto('/login')`
- `page.fill('#email', '...')`
- `page.fill('#password', '...')`
- `page.click('button[type=submit]')`
- **Dùng:** Chỉ trong `auth.spec.ts` — test form validation, toast messages, redirect

### 4.2 helpers/auth.ts
```typescript
// tests/helpers/auth.ts
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALES';

const DEMO_ACCOUNTS = {
  SUPER_ADMIN: { email: 'superadmin@abc.com.vn', password: 'Admin@123456' },
  ADMIN:       { email: 'admin@abc.com.vn',     password: 'Admin@123456' },
  SALES:       { email: 'sales@abc.com.vn',     password: 'Sales@123456' },
};

export async function loginAs(
  request: APIRequestContext,
  role: Role = 'ADMIN'
): Promise<{ accessToken: string; refreshToken: string; user: any }> {
  const { email, password } = DEMO_ACCOUNTS[role];
  const res = await request.post('/api/auth/login', {
    data: { email, password },
  });
  if (res.status() !== 200) throw new Error(`Login failed: ${res.status()} ${await res.text()}`);
  return res.json();
}

export async function loginAsUI(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

export async function getMe(request: APIRequestContext, accessToken: string) {
  const res = await request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}
```

### 4.3 helpers/api-client.ts
```typescript
// tests/helpers/api-client.ts
export class ApiClient {
  constructor(
    private baseURL: string,
    private accessToken?: string
  ) {}

  setToken(token: string) {
    this.accessToken = token;
    return this;
  }

  async get(path: string) { /* ... */ }
  async post(path: string, body?: object) { /* ... */ }
  async patch(path: string, body?: object) { /* ... */ }
  async put(path: string, body?: object) { /* ... */ }
  async delete(path: string) { /* ... */ }
  async upload(path: string, formData: FormData) { /* ... */ }
}
```

### 4.4 helpers/fixtures.ts
```typescript
// tests/helpers/fixtures.ts
// Tạo test data bằng API (không đụng Prisma trực tiếp)
// Đảm bảo mỗi test có data riêng, không conflict

export async function createTestLead(api: ApiClient, overrides = {}) {
  const res = await api.post('/leads', {
    fullName: `Test Lead ${Date.now()}`,
    email: `lead${Date.now()}@test.com`,
    phone: '0900000000',
    source: 'WEBSITE',
    status: 'NEW',
    ...overrides,
  });
  return res.data;
}

// Tương tự: createTestDeal, createTestContact, createTestCompany, ...
```

---

## 5. Test Suite Chi Tiết

### 5.1 Auth (`auth.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| AUTH-01 | Valid login thành công | POST /api/auth/login đúng credentials | 200, `{ accessToken, refreshToken, user }` |
| AUTH-02 | Login sai password | POST /api/auth/login sai pass | 401, error message |
| AUTH-03 | Login tài khoản không tồn tại | POST /api/auth/login email lạ | 401, generic message (no enumeration) |
| AUTH-04 | Login thiếu fields | POST /api/auth/login `{}` | 400, validation errors |
| AUTH-05 | Token refresh | POST /api/auth/refresh với refreshToken hợp lệ | 200, new `{ accessToken, refreshToken }` |
| AUTH-06 | Refresh token hết hạn | POST /api/auth/refresh với token giả | 401 |
| AUTH-07 | Logout 1 token | POST /api/auth/logout với refreshToken | 204 |
| AUTH-08 | Logout tất cả tokens | POST /api/auth/logout rỗng | 204 |
| AUTH-09 | Reuse revoked token | Refresh → revoke → refresh lại | 401 |
| AUTH-10 | Forgot password (user tồn tại) | POST /api/auth/forgot-password | 200, generic success msg |
| AUTH-11 | Forgot password (user không tồn tại) | POST /api/auth/forgot-password ghost email | 200, same generic msg |
| AUTH-12 | Rate limit login | Gọi POST /api/auth/login 11 lần nhanh | 429 on 11th |
| AUTH-13 | Get /me | GET /api/auth/me với token | 200, full user + roles + permissions |
| AUTH-14 | **E2E:** Login form submit đúng | Fill form, submit, redirect /dashboard | URL contains `/dashboard`, toast hiện |
| AUTH-15 | **E2E:** Login form sai | Fill form sai, submit | Toast error hiện, stay on /login |
| AUTH-16 | **E2E:** Remember me checkbox | Login với rememberMe, reload page | Vẫn logged in (localStorage) |
| AUTH-17 | **E2E:** Forgot password flow | Submit email → verify console/log có reset link | 200 |
| AUTH-18 | **E2E:** Reset password (token hợp lệ) | Gọi API lấy token → fill reset form | 200, login với password mới thành công |

### 5.2 Leads (`leads.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| LEAD-01 | Tạo lead mới | POST /api/leads | 201, lead object returned |
| LEAD-02 | List leads (empty) | GET /api/leads | 200, `{ data: [], meta: {...} }` |
| LEAD-03 | List leads (có data) | GET /api/leads sau khi tạo | 200, lead in data array |
| LEAD-04 | Get lead by ID | GET /api/leads/:id | 200, includes timeline |
| LEAD-05 | Update lead | PATCH /api/leads/:id | 200, fields updated |
| LEAD-06 | Assign lead | PATCH /api/leads/:id/assign | 200, assignee updated |
| LEAD-07 | Convert lead → Contact | POST /api/leads/:id/convert | 200, convertedAt set |
| LEAD-08 | Delete lead | DELETE /api/leads/:id | 204 |
| LEAD-09 | Get deleted lead | GET /api/leads/:id (đã xóa) | 404 |
| LEAD-10 | Filter leads by status | GET /api/leads?status=NEW | 200, filtered data |
| LEAD-11 | Search leads | GET /api/leads?search=keyword | 200, filtered data |
| LEAD-12 | Pagination | GET /api/leads?page=2&limit=5 | 200, meta.pagination correct |
| LEAD-13 | Export CSV | GET /api/leads/export/csv | 200, Content-Type: text/csv |
| LEAD-14 | **E2E:** Tạo lead từ UI | Click "Tạo lead", fill form, submit | Toast "Tạo lead thành công", lead appears in list |
| LEAD-15 | **E2E:** Xóa lead từ UI | Click delete, confirm | Toast "Đã xóa lead", row removed |
| LEAD-16 | RBAC: SALES không được xóa lead | Login as SALES, DELETE /api/leads/:id | 403 |
| LEAD-17 | RBAC: SALES không có leads:delete | Login as SALES, DELETE /api/leads/:id | 403 |

### 5.3 Deals (`deals.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| DEAL-01 | Tạo deal | POST /api/deals | 201 |
| DEAL-02 | List deals | GET /api/deals | 200, array |
| DEAL-03 | Kanban view | GET /api/deals/kanban | 200, grouped by stage |
| DEAL-04 | Get pipelines | GET /api/deals/pipelines | 200, stages array |
| DEAL-05 | Move deal stage | PATCH /api/deals/:id/stage | 200, stage updated |
| DEAL-06 | Mark deal WON | PATCH /api/deals/:id/won | 200, status=WON |
| DEAL-07 | Mark deal LOST | PATCH /api/deals/:id/lost | 200, status=LOST |
| DEAL-08 | Delete deal | DELETE /api/deals/:id | 204 |
| DEAL-09 | **E2E:** Kanban drag-drop UI | Kéo deal sang stage khác | Deal moves, API called, stage updated |
| DEAL-10 | **E2E:** Mark WON từ UI | Click "Đánh dấu thắng" | Toast "Deal đã thắng!", status badge changes |
| DEAL-11 | **E2E:** Mark LOST từ UI | Click "Đánh dấu thua" | Toast "Đã đánh dấu thua!", status badge changes |

### 5.4 Tasks (`tasks.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| TASK-01 | Tạo task | POST /api/tasks | 201 |
| TASK-02 | List tasks | GET /api/tasks | 200, array |
| TASK-03 | Kanban view | GET /api/tasks/kanban | 200, grouped by status |
| TASK-04 | Move task status | PATCH /api/tasks/:id/status | 200 |
| TASK-05 | Add comment | POST /api/tasks/:id/comments | 201 |
| TASK-06 | Add watcher | POST /api/tasks/:id/watchers/:userId | 201 |
| TASK-07 | Remove watcher | DELETE /api/tasks/:id/watchers/:userId | 204 |
| TASK-08 | Delete task | DELETE /api/tasks/:id | 204 |
| TASK-09 | **E2E:** Kanban board | Navigate /tasks, verify columns render | 5 columns: TODO, IN_PROGRESS, REVIEW, DONE, CANCELLED |
| TASK-10 | **E2E:** Create task modal | Click "Tạo nhiệm vụ", fill form | Toast "Đã tạo nhiệm vụ", card appears |

### 5.5 Contacts, Companies, Projects

| Module | Test Cases |
|---|---|
| **Contacts** | CRUD, search, pagination, link to company, E2E create/edit/delete modal |
| **Companies** | CRUD, search, pagination, E2E create/edit/delete modal |
| **Projects** | CRUD, status filter, E2E create/edit/delete modal |

### 5.6 Conversations / Inbox (`conversations.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| CONV-01 | List conversations | GET /api/conversations?status=OPEN | 200 |
| CONV-02 | Assign conversation | PATCH /api/conversations/:id/assign | 200 |
| CONV-03 | Link to contact | PATCH /api/conversations/:id/link | 200 |
| CONV-04 | Update status | PATCH /api/conversations/:id/status | 200 |
| CONV-05 | Send message | POST /api/conversations/:id/messages | 201 |
| CONV-06 | **E2E:** Inbox page | Navigate /inbox, verify conversations load | List rendered |
| CONV-07 | **E2E:** Assign agent | Click assign, select user | API called, UI updated |

### 5.7 Notifications (`notifications.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| NOTI-01 | List notifications | GET /api/notifications | 200 |
| NOTI-02 | Filter unread only | GET /api/notifications?unreadOnly=true | 200, only unread |
| NOTI-03 | Mark single read | PATCH /api/notifications/:id/read | 200 |
| NOTI-04 | Mark all read | PATCH /api/notifications/read-all | 200 |
| NOTI-05 | Delete notification | DELETE /api/notifications/:id | 204 |
| NOTI-06 | **E2E:** Bell icon | Click bell, dropdown shows | Notification list rendered |
| NOTI-07 | **E2E:** Mark read via UI | Click notification item | Item marked as read |

### 5.8 Reporting (`reporting.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| REP-01 | Dashboard KPIs | GET /api/reporting/dashboard | 200, `{ leadsCount, dealsCount, tasksCount, ... }` |
| REP-02 | Sales funnel | GET /api/reporting/sales-funnel | 200, grouped by stage |
| REP-03 | Leads by source | GET /api/reporting/leads-by-source | 200, grouped by source |
| REP-04 | Activities timeline | GET /api/reporting/activities-timeline?days=30 | 200, time series data |
| REP-05 | Campaign stats | GET /api/reporting/campaign-stats | 200 |
| REP-06 | **E2E:** Dashboard page | Navigate /dashboard | Charts rendered, stats loaded |
| REP-07 | **E2E:** Dashboard loading state | Reload /dashboard | Loading spinner shown |

### 5.9 RBAC (`rbac.spec.ts`)

| ID | Test Case | Setup | Expected |
|---|---|---|---|
| RBAC-01 | SALES cannot read users | Login as SALES, GET /api/users | 403 |
| RBAC-02 | SALES can read leads | Login as SALES, GET /api/leads | 200 |
| RBAC-03 | ADMIN assign role | Login as ADMIN, assign role to user | 201 |
| RBAC-04 | SALES cannot assign role | Login as SALES, assign role | 403 |
| RBAC-05 | SUPER_ADMIN bypass all | Login as SUPER_ADMIN, any action | No 403 |
| RBAC-06 | **E2E:** Users page hidden for SALES | Login as SALES, navigate /users | Redirect or 403 page |
| RBAC-07 | **E2E:** Leads page visible for SALES | Login as SALES, navigate /leads | Page renders, data loads |

### 5.10 Audit (`audit.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| AUDIT-01 | List all logs | GET /api/audit | 200, paginated |
| AUDIT-02 | Filter by resource | GET /api/audit?resource=lead | 200, only lead actions |
| AUDIT-03 | Filter by action | GET /api/audit?action=CREATE | 200, only CREATE |
| AUDIT-04 | **E2E:** Audit page | Navigate /audit | Table rendered, pagination works |

### 5.11 Tags & Notes & Activities

| Module | Test Cases |
|---|---|
| **Tags** | CRUD, tag entity (LEAD, CONTACT, COMPANY, DEAL), untag, polymorphic lookup |
| **Notes** | CRUD attached to LEAD, CONTACT, COMPANY, DEAL, TASK |
| **Activities** | Log CALL, EMAIL, MEETING; filter by entityType/entityId; delete |

### 5.12 Organizations (`organizations.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| ORG-01 | Get current org | GET /api/organizations/me | 200 |
| ORG-02 | Update org | PATCH /api/organizations/me | 200 |
| ORG-03 | CRUD departments | POST/GET/PATCH/DELETE /api/organizations/departments | CRUD works |
| ORG-04 | CRUD teams | POST/GET/DELETE /api/organizations/teams | CRUD works |
| ORG-05 | **E2E:** Settings page | Navigate /settings | Tabs render, org info loaded |
| ORG-06 | **E2E:** Create department | Fill form, submit | Toast success, tree updates |

### 5.13 Integrations (`integrations.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| INT-01 | Zalo verify token sai | GET /api/integrations/zalo/webhook?hub.verify_token=bad | 403 |
| INT-02 | Zalo verify token đúng | GET /api/integrations/zalo/webhook?hub.verify_token=<correct>&hub.challenge=abc | 200, body=abc |
| INT-03 | Zalo inbound event | POST /api/integrations/zalo/webhook | 200 |
| INT-04 | Messenger verify sai | GET /api/integrations/messenger/webhook?hub.verify_token=bad | 403 |
| INT-05 | Messenger verify đúng | GET /api/integrations/messenger/webhook?hub.verify_token=<correct>&hub.challenge=abc | 200, body=abc |
| INT-06 | Messenger inbound | POST /api/integrations/messenger/webhook | 200 |

### 5.14 Error & Edge Cases (`errors.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| ERR-01 | No token → 401 | GET /api/users (no auth) | 401 |
| ERR-02 | Invalid token → 401 | GET /api/users, Bearer "invalid" | 401 |
| ERR-03 | Expired token → 401 | GET /api/users, Bearer expired JWT | 401 |
| ERR-04 | No permission → 403 | Login as SALES, DELETE /users/:id | 403 |
| ERR-05 | Resource not found → 404 | GET /api/leads/00000000-... | 404 |
| ERR-06 | Validation error → 400 | POST /api/leads, missing required fields | 400, errors array |
| ERR-07 | Rate limit → 429 | POST /api/auth/login ×11 fast | 429 |
| ERR-08 | Error response shape | Any error | `{ statusCode, message, path, timestamp, traceId }` |
| ERR-09 | **E2E:** Unauthorized redirect | Go to /dashboard without login | Redirect to /login |
| ERR-10 | **E2E:** 404 page | Navigate /nonexistent | 404 page renders |

### 5.15 Marketing (`marketing.spec.ts`)

| ID | Test Case | Steps | Expected |
|---|---|---|---|
| MKT-01 | CRUD templates | POST/GET/PATCH/DELETE /api/marketing/templates | CRUD works |
| MKT-02 | CRUD campaigns | POST/GET/PATCH/DELETE /api/marketing/campaigns | CRUD works |
| MKT-03 | Launch campaign | POST /api/marketing/campaigns/:id/launch | 200, status=ACTIVE |
| MKT-04 | Pause campaign | POST /api/marketing/campaigns/:id/pause | 200, status=PAUSED |
| MKT-05 | Campaign summary | GET /api/marketing/campaigns/:id/summary | 200 |
| MKT-06 | **E2E:** Marketing page | Navigate /marketing | Tabs render, data loads |

---

## 6. Error Response Shape

Tất cả errors phải match format:

```json
{
  "statusCode": 401,
  "message": "Invalid or expired token",
  "errors": undefined,
  "path": "/api/users",
  "timestamp": "2026-03-26T00:00:00.000Z",
  "traceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 7. Test Data & Database Strategy

### 7.1 Nguyên tắc
- **Không hardcode IDs** từ seed data — mọi test tự tạo data riêng qua API
- Mỗi test tạo data riêng (`beforeEach`), cleanup sau (`afterEach`)
- Dùng `Date.now()` suffix để tránh trùng lặp tên
- API seed có sẵn demo accounts: `superadmin@abc.com.vn`, `admin@abc.com.vn`, `sales@abc.com.vn`

### 7.2 Setup/Teardown Pattern
```typescript
describe('Leads CRUD', () => {
  let api: ApiClient;
  let adminToken: string;
  let salesToken: string;

  beforeAll(async () => {
    const admin = await loginAs('ADMIN');
    adminToken = admin.accessToken;
    const sales = await loginAs('SALES');
    salesToken = sales.accessToken;
    api = new ApiClient(BASE_URL, adminToken);
  });

  let createdLeadId: string;

  beforeEach(async () => {
    // Tạo data mới cho mỗi test
    const res = await api.post('/leads', { fullName: `Lead ${Date.now()}`, ... });
    createdLeadId = res.data.id;
  });

  afterEach(async () => {
    // Cleanup: xóa lead đã tạo
    if (createdLeadId) {
      await api.delete(`/leads/${createdLeadId}`);
    }
  });
});
```

---

## 8. Frontend E2E Testing Patterns

### 8.1 Auth Seeding cho UI Tests
```typescript
// Trước khi test E2E, seed localStorage
await loginAsUI(page, 'admin@abc.com.vn', 'Admin@123456');
// Hoặc:
await page.context().addInitScript(() => {
  localStorage.setItem('crm-auth', JSON.stringify({
    accessToken: '...',
    refreshToken: '...',
    user: { id: '...', email: '...', roles: ['ADMIN'], permissions: [] }
  }));
});
```

### 8.2 Common Assertions
```typescript
// Toast assertions
await expect(page.locator('.toast')).toContainText('Tạo lead thành công');

// URL assertions
await expect(page).toHaveURL(/.*\/dashboard/);

// Data table assertions
await expect(page.locator('table tbody tr').first()).toContainText('Test Lead Name');

// Form validation assertions
await page.click('button[type=submit]');
await expect(page.locator('text=Email là bắt buộc')).toBeVisible();

// Loading state
await expect(page.locator('text=Đang tải...')).toBeVisible();
```

### 8.3 Pagination Tests
```typescript
// Tạo 15 leads → 2 pages (10 + 5)
for (let i = 0; i < 15; i++) {
  await api.post('/leads', { fullName: `Lead ${i}`, ... });
}
await page.goto('/leads');
await expect(page.locator('table tbody tr')).toHaveCount(10); // page 1
await page.click('button:has-text("2")');
await expect(page.locator('table tbody tr')).toHaveCount(5); // page 2
```

---

## 9. Prerequisites & Running Tests

### 9.1 Prerequisites
```bash
# 1. Cài Playwright
pnpm add -D @playwright/test
npx playwright install chromium

# 2. Chạy database + backend + frontend
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev  # Chạy cả api (3000) và web (3001)

# 3. Chạy tests
pnpm playwright test

# 4. Xem report
pnpm playwright show-report
```

### 9.2 Test Execution Commands
```bash
# Chạy tất cả
pnpm playwright test

# Chạy 1 file
pnpm playwright test tests/auth/auth.spec.ts

# Chạy 1 test cụ thể
pnpm playwright test tests/auth/auth.spec.ts --grep "Valid login"

# Chạy E2E only
pnpm playwright test --grep "E2E" --project=chromium

# Chạy API only
pnpm playwright test tests/auth/auth.spec.ts --grep "AUTH-0" --project=chromium

# Debug mode
pnpm playwright test --debug

# headed mode (thấy trình duyệt)
pnpm playwright test --headed
```

---

## 10. CI Integration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: cp .env .env.test
      - run: docker compose up -d
      - run: pnpm --filter api db:migrate
      - run: pnpm --filter api db:seed
      - run: pnpm playwright install --with-deps chromium
      - run: pnpm playwright test
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 11. Known Limitations

1. **Webhook verify tokens** cần giá trị đúng từ env — cần đọc từ `.env.test` hoặc mock
2. **CSV export** chỉ verify `Content-Type: text/csv`, không parse nội dung
3. **CSV import** cần file CSV hợp lệ — sẽ tạo fixture file trong `tests/fixtures/sample.csv`
4. **Soft delete:** Đã xóa records sẽ trả 404 — verified trong tests
5. **Polling intervals** (notifications 30s, inbox 15s) — tests không mock được polling, chỉ verify initial load
6. **Real-time/WebSocket:** Không có trong codebase — skip

---

## 12. Summary — Test Count

| Module | API Tests | E2E Tests | Total |
|---|---|---|---|
| Auth | 13 | 5 | **18** |
| Leads | 12 | 2 | **14** |
| Deals | 8 | 3 | **11** |
| Tasks | 8 | 2 | **10** |
| Contacts | 5 | 2 | **7** |
| Companies | 5 | 2 | **7** |
| Projects | 5 | 2 | **7** |
| Conversations | 5 | 2 | **7** |
| Notifications | 5 | 2 | **7** |
| Reporting | 5 | 2 | **7** |
| RBAC | 6 | 2 | **8** |
| Audit | 4 | 1 | **5** |
| Tags | 6 | 0 | **6** |
| Notes | 4 | 0 | **4** |
| Activities | 4 | 0 | **4** |
| Organizations | 6 | 2 | **8** |
| Integrations | 6 | 0 | **6** |
| Errors | 10 | 2 | **12** |
| **Total** | **~117** | **~29** | **~146** |
