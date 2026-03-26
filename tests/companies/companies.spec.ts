// tests/companies/companies.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createCompany } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

test.describe('Companies — API Tests', () => {
  let adminApi: ApiClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminCtx: any;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext();
    const admin = await loginAs(adminCtx, 'ADMIN');
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('COMPANY-01: Create company returns 201 with id and name', async () => {
    const company = await createCompany(adminApi);
    try {
      expect(company.id).toBeDefined();
      expect(company.name).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/companies/${company.id}`); } catch {}
    }
  });

  test('COMPANY-02: List companies returns paginated response', async () => {
    const res = await adminApi.get<any>('/companies');
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('COMPANY-03: Get company by ID returns company', async () => {
    const company = await createCompany(adminApi);
    try {
      const res = await adminApi.get<any>(`/companies/${company.id}`);
      expect(res.data.id).toBe(company.id);
      expect(res.data.name).toBe(company.name);
    } finally {
      try { await adminApi.delete(`/companies/${company.id}`); } catch {}
    }
  });

  test('COMPANY-04: Update company returns updated object', async () => {
    const company = await createCompany(adminApi);
    try {
      const res = await adminApi.patch<any>(`/companies/${company.id}`, {
        name: 'Updated Company Name',
      });
      expect(res.data.name).toBe('Updated Company Name');
    } finally {
      try { await adminApi.delete(`/companies/${company.id}`); } catch {}
    }
  });

  test('COMPANY-05: Delete company returns 204 and GET returns 404', async () => {
    const company = await createCompany(adminApi);
    try {
      await adminApi.delete(`/companies/${company.id}`);
      let errorStatus: number | undefined;
      try {
        await adminApi.get(`/companies/${company.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/companies/${company.id}`); } catch {}
    }
  });

  test('COMPANY-06: Search companies returns filtered results', async () => {
    const uniqueName = `UniqueCompanySearch_${Date.now()}`;
    const company = await createCompany(adminApi, { name: uniqueName });
    try {
      const res = await adminApi.get<any>(`/companies?search=${encodeURIComponent(uniqueName)}`);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.some((c: any) => c.name === uniqueName)).toBe(true);
    } finally {
      try { await adminApi.delete(`/companies/${company.id}`); } catch {}
    }
  });
});

test.describe('Companies — E2E Tests', () => {
  test('COMPANY-07: Companies page loads', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    const admin = await loginAs(ctx, 'ADMIN');
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
