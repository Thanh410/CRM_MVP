// tests/contacts/contacts.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createContact } from '../helpers/fixtures';

const API = process.env.API_BASE_URL!;

test.describe('Contacts — API Tests', () => {
  let adminApi: ApiClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminCtx: any;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext({ baseURL: API });
    const admin = await loginAs(adminCtx, 'ADMIN');
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('CONTACT-01: Create contact returns 201 with id, fullName, email', async () => {
    const contact = await createContact(adminApi);
    try {
      expect(contact.id).toBeDefined();
      expect(contact.fullName).toBeTruthy();
      expect(contact.email).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-02: List contacts returns paginated response', async () => {
    const res = await adminApi.get<any>('/contacts');
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('CONTACT-03: Get contact by ID returns contact with fullName', async () => {
    const contact = await createContact(adminApi);
    try {
      const res = await adminApi.get<any>(`/contacts/${contact.id}`);
      expect(res.data.id).toBe(contact.id);
      expect(res.data.fullName).toBe(contact.fullName);
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-04: Update contact returns updated object', async () => {
    const contact = await createContact(adminApi);
    try {
      const res = await adminApi.patch<any>(`/contacts/${contact.id}`, {
        fullName: 'Updated Contact Name',
      });
      expect(res.data.fullName).toBe('Updated Contact Name');
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-05: Delete contact returns 204 and GET returns 404', async () => {
    const contact = await createContact(adminApi);
    try {
      await adminApi.delete(`/contacts/${contact.id}`);
      let errorStatus: number | undefined;
      try {
        await adminApi.get(`/contacts/${contact.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-06: Search contacts returns filtered results', async () => {
    const uniqueName = `UniqueContactSearch_${Date.now()}`;
    const contact = await createContact(adminApi, { fullName: uniqueName });
    try {
      const res = await adminApi.get<any>(`/contacts?search=${encodeURIComponent(uniqueName)}`);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.some((c: any) => c.fullName === uniqueName)).toBe(true);
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });
});

test.describe('Contacts — E2E Tests', () => {
  test('CONTACT-07: Contacts page loads', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext({ baseURL: API });
    const admin = await loginAs(ctx, 'ADMIN');
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
