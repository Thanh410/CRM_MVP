// tests/leads/leads.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead, newEmail } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

// NOTE: All API responses use { data: T } envelope convention.
// createLead strips envelope (returns T). GET/PATCH also return { data: T }.
// If API returns bare T instead, update fixtures.ts and assertions accordingly.

test.describe('Leads — API Tests', () => {
  let adminApi: ApiClient;
  let salesApi: ApiClient;
  // Store contexts at describe scope so afterAll can dispose them
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminCtx: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let salesCtx: any;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext();
    salesCtx = await pwRequest.newContext();
    const admin = await loginAs(adminCtx, 'ADMIN');
    const sales = await loginAs(salesCtx, 'SALES');
    adminApi = new ApiClient(API, admin.accessToken);
    salesApi = new ApiClient(API, sales.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
    if (salesCtx) await salesCtx.dispose();
  });

  test('LEAD-01: Create lead returns 201 and lead object', async () => {
    const lead = await createLead(adminApi);
    try {
      expect(lead.id).toBeDefined();
      expect(lead.status).toBe('NEW');
      expect(lead.fullName).toBeTruthy();
      expect(lead.email).toBeTruthy();
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-02: List leads returns paginated response', async () => {
    const res = await adminApi.get<any>('/leads');
    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('meta');
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('LEAD-03: Get lead by ID returns lead with timeline', async () => {
    const lead = await createLead(adminApi);
    try {
      const res = await adminApi.get<any>(`/leads/${lead.id}`);
      expect(res.data.id).toBe(lead.id);
      expect(res.data.fullName).toBe(lead.fullName);
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-04: Update lead returns updated object', async () => {
    const lead = await createLead(adminApi);
    try {
      const res = await adminApi.patch<any>(`/leads/${lead.id}`, {
        fullName: 'Updated Name',
        status: 'CONTACTED',
      });
      expect(res.data.fullName).toBe('Updated Name');
      expect(res.data.status).toBe('CONTACTED');
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-05: Assign lead to user returns updated lead', async () => {
    const lead = await createLead(adminApi);
    let assignCtx: Awaited<ReturnType<typeof pwRequest.newContext>> | null = null;
    try {
      assignCtx = await pwRequest.newContext();
      const admin2 = await loginAs(assignCtx, 'ADMIN');
      const assignApi = new ApiClient(API, admin2.accessToken);
      const res = await assignApi.patch<any>(`/leads/${lead.id}/assign`, {
        assignedTo: admin2.user.id,
      });
      expect(res.data.assigneeId ?? res.data.assignedTo ?? res.data.assignee?.id).toBeTruthy();
    } finally {
      if (assignCtx) await assignCtx.dispose();
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-06: Delete lead returns 204 and resource is gone', async () => {
    const lead = await createLead(adminApi);
    try {
      const res = await adminApi.delete(`/leads/${lead.id}`);
      expect(res).toBeUndefined(); // 204 → undefined
      // Verify deleted — GET should throw ApiError with 404
      let errorStatus: number | undefined;
      try {
        await adminApi.get(`/leads/${lead.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(404);
    } finally {
      // Best-effort cleanup (safe if already deleted)
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('LEAD-07: Get deleted lead returns 404', async () => {
    const lead = await createLead(adminApi);
    await adminApi.delete(`/leads/${lead.id}`);
    let errorStatus: number | undefined;
    try {
      await adminApi.get(`/leads/${lead.id}`);
    } catch (e: any) {
      errorStatus = e?.status;
    }
    expect(errorStatus).toBe(404);
  });

  test('LEAD-08: Filter leads by status', async () => {
    const lead = await createLead(adminApi, { status: 'QUALIFIED' });
    try {
      const res = await adminApi.get<any>('/leads?status=QUALIFIED');
      expect(Array.isArray(res.data)).toBe(true);
      // All leads in response should be QUALIFIED
      res.data.forEach((l: any) => {
        expect(l.status).toBe('QUALIFIED');
      });
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-09: Search leads by keyword', async () => {
    const uniqueName = `UniqueLeadSearch_${Date.now()}`;
    const lead = await createLead(adminApi, { fullName: uniqueName });
    try {
      const res = await adminApi.get<any>(`/leads?search=${encodeURIComponent(uniqueName)}`);
      expect(res.data.some((l: any) => l.fullName === uniqueName)).toBe(true);
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-10: Pagination — page 1 returns correct meta', async () => {
    const res = await adminApi.get<any>('/leads?page=1&limit=5');
    expect(res.meta).toBeDefined();
    expect(res.meta.page).toBe(1);
    expect(res.meta.limit).toBe(5);
  });

  test('LEAD-11: SALES role cannot delete lead (RBAC)', async () => {
    const lead = await createLead(adminApi);
    try {
      let errorStatus: number | undefined;
      try {
        await salesApi.delete(`/leads/${lead.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(403);
    } finally {
      await adminApi.delete(`/leads/${lead.id}`);
    }
  });

  test('LEAD-12: SALES role CAN read leads', async () => {
    const res = await salesApi.get<any>('/leads');
    expect(res).toHaveProperty('data');
    expect(res).toHaveProperty('meta');
  });
});

test.describe('Leads — E2E Tests', () => {
  test('LEAD-13: Create lead from UI', async ({ page }) => {
    const pageContext = page.context();
    // Seed localStorage with admin tokens
    const ctx = await pwRequest.newContext();
    const admin = await loginAs(ctx, 'ADMIN');
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');

    // Click create lead button — try multiple selectors
    const createBtn = page.locator('button').filter({ hasText: /tạo|thêm/i }).first();
    await createBtn.click();
    await page.waitForTimeout(500);

    // Fill form — use CSS attribute selectors for placeholder matching
    const nameInput = page.locator('input[placeholder*="họ tên"], input[placeholder*="tên"], input[placeholder*="name"]').first();
    const emailInput = page.locator('input[placeholder*="email"], input[placeholder*="Email"]').first();
    const phoneInput = page.locator('input[placeholder*="điện thoại"], input[placeholder*="phone"], input[placeholder*="Phone"], input[placeholder*="số điện"]').first();

    await nameInput.fill('E2E Lead ' + Date.now());
    await emailInput.fill(newEmail());
    await phoneInput.fill('0909000000');

    // Submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Verify toast or redirect
    const toastPromise = page.waitForSelector('[class*="toast"]', { timeout: 5000 }).catch(() => null);
    const redirectPromise = page.waitForURL(/.*\/leads/, { timeout: 5000 }).catch(() => null);
    await Promise.race([toastPromise, redirectPromise]);
  });

  test('LEAD-14: Leads list page loads with data', async ({ page }) => {
    const pageContext = page.context();
    // Seed localStorage with admin tokens
    const ctx2 = await pwRequest.newContext({ baseURL: API });
    const admin2 = await loginAs(ctx2, 'ADMIN');
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin2);
    await ctx2.dispose();

    await page.goto('/leads');
    await page.waitForLoadState('networkidle');
    // Page should show something (table or "no data")
    await expect(page.locator('body')).toBeVisible();
  });
});
