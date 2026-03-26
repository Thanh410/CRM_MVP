# CRM MVP Frontend-Backend E2E Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết lập và chạy bộ kiểm thử E2E đầy đủ để xác minh tích hợp frontend (Next.js) và backend (NestJS) trên môi trường local Docker, có báo cáo kết quả rõ ràng.

**Architecture:** Dùng chiến lược 2 lớp kiểm thử: (1) API E2E bằng Jest + Supertest để xác minh hợp đồng backend với DB/Redis thật; (2) UI E2E bằng Playwright để kiểm tra luồng người dùng từ frontend qua backend thật. Tách cấu hình test riêng để không ảnh hưởng luồng dev hiện tại, và thu thập evidence (log, screenshot, trace) cho debug có hệ thống.

**Tech Stack:** Node.js 20+, pnpm workspace, Docker Compose (Postgres/Redis/MinIO), NestJS + Jest + Supertest, Next.js 14, Playwright.

---

## 0) Scope & Current Facts (đã xác minh)

- Repo hiện có script `apps/api/package.json -> test:e2e`, nhưng **thiếu file** `apps/api/jest.e2e.config.ts`.
- `apps/api` hiện **chưa có test files** (`*.spec.ts`) để chạy thật.
- `apps/web` chưa có Playwright/Cypress config.
- Vì vậy, để “run e2e integration FE-BE”, cần **bổ sung test harness trước**, sau đó mới chạy test.

---

## 1) File Structure Plan

### Files to create
- `apps/api/jest.e2e.config.ts`
  - Cấu hình Jest E2E riêng cho API (root, testRegex, ts-jest, setup).
- `apps/api/test/e2e/setup-e2e.ts`
  - Bootstrap app test, load env test, helper login, helper cleanup.
- `apps/api/test/e2e/auth-login.e2e-spec.ts`
  - E2E cho `/auth/login` + `/auth/me`.
- `apps/api/test/e2e/leads-crud.e2e-spec.ts`
  - E2E CRUD lead (create/list/update), xác minh integration DB.
- `apps/web/playwright.config.ts`
  - Cấu hình Playwright cho web app, baseURL, retries, trace/screenshot.
- `apps/web/tests/e2e/login-smoke.spec.ts`
  - UI E2E login + vào dashboard.
- `apps/web/tests/e2e/leads-flow.spec.ts`
  - UI E2E tạo lead và xác minh hiển thị.
- `scripts/e2e/run-local-e2e.sh`
  - Script orchestration local: start infra, migrate/seed, run API E2E + UI E2E.
- `docs/testing/e2e/2026-03-25-local-e2e-report.md`
  - Báo cáo kết quả test, pass/fail, root cause nếu fail.

### Files to modify
- `apps/api/package.json`
  - Sửa `test:e2e` trỏ đúng config file mới.
  - Thêm `test:e2e:watch` và script test theo file nếu cần.
- `apps/web/package.json`
  - Thêm scripts: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`.
- `package.json` (root)
  - Thêm orchestrator scripts tiện chạy (`e2e:local`, `e2e:api`, `e2e:web`).
- `.github/workflows/ci.yml` (optional trong phase sau)
  - Thêm job E2E riêng sau khi local ổn định.

---

### Task 1: Chuẩn hóa môi trường kiểm thử local

**Files:**
- Modify: `.env`, `apps/api/.env` (chỉ local)
- Test/Verify: `docker-compose.yml`

- [ ] **Step 1: Xác minh Docker daemon + services local**

Run: `docker compose -f docker-compose.yml up -d postgres redis minio`
Expected: containers ở trạng thái `running/healthy`.

- [ ] **Step 2: Xác minh dependency tools**

Run: `corepack pnpm -v && node -v`
Expected: pnpm usable, Node >= 20.

- [ ] **Step 3: Xác minh env tối thiểu cho test**

Check keys: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`.
Expected: không thiếu biến quan trọng.

- [ ] **Step 4: Kiểm tra DB connectivity**

Run: `corepack pnpm -C apps/api exec prisma db pull --print`
Expected: kết nối DB thành công (không auth/network error).

- [ ] **Step 5: Commit (nếu có đổi script/config repo)**

```bash
git add apps/api/package.json apps/web/package.json package.json
git commit -m "chore(test): prepare local e2e environment scripts"
```

---

### Task 2: Tạo API E2E harness (Jest + Supertest)

**Files:**
- Create: `apps/api/jest.e2e.config.ts`
- Create: `apps/api/test/e2e/setup-e2e.ts`
- Modify: `apps/api/package.json`

- [ ] **Step 1: Viết test config tối thiểu (failing setup expected)**

```ts
// apps/api/jest.e2e.config.ts
export default {
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: 'test/e2e/.*\\.e2e-spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

- [ ] **Step 2: Chạy để xác minh fail có kiểm soát**

Run: `corepack pnpm -C apps/api test:e2e`
Expected: fail kiểu “No tests found” (không còn lỗi missing config).

- [ ] **Step 3: Viết bootstrap setup file**

Tạo helper `createTestApp()`, `loginAsDemoUser()`, `cleanupTestData()`.

- [ ] **Step 4: Chạy lại verify harness load được**

Run: `corepack pnpm -C apps/api test:e2e -- --listTests`
Expected: command chạy bình thường, liệt kê test khi có file.

- [ ] **Step 5: Commit**

```bash
git add apps/api/jest.e2e.config.ts apps/api/test/e2e/setup-e2e.ts apps/api/package.json
git commit -m "test(api): add jest e2e harness and config"
```

---

### Task 3: Viết API E2E test cases cốt lõi (TDD)

**Files:**
- Create: `apps/api/test/e2e/auth-login.e2e-spec.ts`
- Create: `apps/api/test/e2e/leads-crud.e2e-spec.ts`

- [ ] **Step 1: Viết test login/me (failing trước)**

```ts
it('POST /auth/login then GET /auth/me returns user profile', async () => {
  // login with seeded account, call /auth/me with access token
});
```

- [ ] **Step 2: Chạy 1 test để xác minh fail đúng chỗ**

Run: `corepack pnpm -C apps/api test:e2e -- auth-login.e2e-spec.ts`
Expected: fail nếu app bootstrap/auth contract chưa đúng.

- [ ] **Step 3: Sửa tối thiểu trong setup/helper để pass**

Chỉ chỉnh test setup/helpers, không đổi business logic nếu chưa cần.

- [ ] **Step 4: Viết test leads create/list/update (failing trước)**

```ts
it('creates lead and can retrieve/update it via API', async () => {
  // create lead -> list/filter -> patch -> assert persisted state
});
```

- [ ] **Step 5: Chạy full API E2E suite**

Run: `corepack pnpm -C apps/api test:e2e`
Expected: tất cả API e2e pass.

- [ ] **Step 6: Commit**

```bash
git add apps/api/test/e2e/auth-login.e2e-spec.ts apps/api/test/e2e/leads-crud.e2e-spec.ts
git commit -m "test(api): add auth and leads end-to-end coverage"
```

---

### Task 4: Thiết lập UI E2E (Playwright)

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/tests/e2e/login-smoke.spec.ts`
- Create: `apps/web/tests/e2e/leads-flow.spec.ts`
- Modify: `apps/web/package.json`

- [ ] **Step 1: Viết cấu hình Playwright và scripts (failing first)**

```ts
// baseURL: http://localhost:3001
// trace: 'on-first-retry', screenshot: 'only-on-failure'
```

- [ ] **Step 2: Chạy test smoke rỗng để xác minh runner hoạt động**

Run: `corepack pnpm -C apps/web test:e2e -- --list`
Expected: runner start được, detect test files.

- [ ] **Step 3: Viết login smoke test**

Kịch bản: mở `/login` -> nhập demo account -> submit -> thấy dashboard.

- [ ] **Step 4: Viết lead flow test**

Kịch bản: login -> vào leads -> tạo lead -> assert row mới xuất hiện.

- [ ] **Step 5: Chạy từng test rồi full suite**

Run:
- `corepack pnpm -C apps/web test:e2e -- login-smoke.spec.ts`
- `corepack pnpm -C apps/web test:e2e`

Expected: pass, có artifact khi fail.

- [ ] **Step 6: Commit**

```bash
git add apps/web/playwright.config.ts apps/web/tests/e2e/login-smoke.spec.ts apps/web/tests/e2e/leads-flow.spec.ts apps/web/package.json
git commit -m "test(web): add playwright e2e smoke and leads flow"
```

---

### Task 5: Orchestrate full FE-BE integration run

**Files:**
- Create: `scripts/e2e/run-local-e2e.sh`
- Modify: `package.json`

- [ ] **Step 1: Viết script orchestration (failing-first dry run)**

Script phải tuần tự:
1) `docker compose up -d postgres redis minio`
2) `pnpm db:generate && pnpm db:migrate && pnpm db:seed`
3) start API/Web (hoặc xác minh đang chạy)
4) run API E2E
5) run Web E2E

- [ ] **Step 2: Chạy dry-run từng đoạn để xác minh boundary**

Expected: xác định đúng boundary nào fail (infra, migrate, api, web, test).

- [ ] **Step 3: Chạy full `e2e:local`**

Run: `corepack pnpm -C . e2e:local`
Expected: pass toàn bộ hoặc có lỗi rõ ràng theo stage.

- [ ] **Step 4: Thu thập evidence**

Lưu output logs, playwright traces/screenshots, test summary.

- [ ] **Step 5: Commit**

```bash
git add scripts/e2e/run-local-e2e.sh package.json
git commit -m "chore(test): add local e2e orchestration script"
```

---

### Task 6: Báo cáo kết quả và quyết định tích hợp CI

**Files:**
- Create: `docs/testing/e2e/2026-03-25-local-e2e-report.md`
- Modify (optional): `.github/workflows/ci.yml`

- [ ] **Step 1: Viết báo cáo pass/fail + root cause**

Báo cáo gồm:
- môi trường chạy
- danh sách test đã chạy
- kết quả từng suite
- lỗi + nguyên nhân gốc (nếu có)
- đề xuất fix ưu tiên.

- [ ] **Step 2: Nếu local ổn định, lên kế hoạch CI E2E tối thiểu**

Đề xuất thêm job E2E riêng, không block deploy giai đoạn đầu (soft gate).

- [ ] **Step 3: Verify lại trước khi kết luận hoàn thành (@superpowers:verification-before-completion)**

Run:
- `corepack pnpm -C apps/api test:e2e`
- `corepack pnpm -C apps/web test:e2e`

Expected: pass hoặc có bug report rõ ràng + bằng chứng.

- [ ] **Step 4: Commit**

```bash
git add docs/testing/e2e/2026-03-25-local-e2e-report.md .github/workflows/ci.yml
git commit -m "docs(test): add local e2e execution report and ci follow-up"
```

---

## Execution Notes

- Áp dụng @superpowers:systematic-debugging nếu có bất kỳ test fail nào.
- Không sửa business logic “đoán mò”; chỉ sửa theo evidence từ test/log.
- Ưu tiên giữ test deterministic, không dùng sleep cứng nếu có thể condition-based waiting.

## Definition of Done

- `apps/api test:e2e` chạy được thật (không còn lỗi missing config) và có test cốt lõi pass.
- `apps/web test:e2e` chạy được trên local với API thật.
- Có script orchestration `e2e:local` tái sử dụng được.
- Có báo cáo markdown tổng hợp kết quả và hướng xử lý nếu còn fail.
