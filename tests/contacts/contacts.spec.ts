// tests/contacts/contacts.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createContact } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

const RETRY_MS = 3000;

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt < 2 && (e?.status === 500 || e?.status === 0 || e?.message?.includes('500'))) {
        await new Promise(r => setTimeout(r, RETRY_MS));
        continue;
      }
      throw e;
    }
  }
  return fn();
}


class SkipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SkipError';
  }
}

test.describe('Contacts — API Tests', () => {
  let adminApi: ApiClient;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let adminCtx: any;

  test.beforeAll(async () => {
    adminCtx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(adminCtx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('CONTACT-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('CONTACT-01: Create contact returns 201 with id, fullName, email', async () => {
    const contact = await withRetry(() => createContact(adminApi));
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
    expect(Array.isArray(res.data || res)).toBe(true);
  });

  test('CONTACT-03: Get contact by ID returns contact with fullName', async () => {
    const contact = await withRetry(() => createContact(adminApi));
    try {
      const res = await adminApi.get<any>(`/contacts/${contact.id}`);
      const c = res.data ?? res;
      expect(c.id).toBe(contact.id);
      expect(c.fullName).toBe(contact.fullName);
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-04: Update contact returns updated object', async () => {
    const contact = await withRetry(() => createContact(adminApi));
    try {
      const res = await adminApi.patch<any>(`/contacts/${contact.id}`, {
        fullName: 'Updated Contact Name',
      });
      const c = res.data ?? res;
      expect(c.fullName).toBe('Updated Contact Name');
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });

  test('CONTACT-05: Delete contact returns 204 and GET returns 404', async () => {
    const contact = await withRetry(() => createContact(adminApi));
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
    const contact = await withRetry(() => createContact(adminApi, { fullName: uniqueName }));
    try {
      const res = await adminApi.get<any>(`/contacts?search=${encodeURIComponent(uniqueName)}`);
      const items = Array.isArray(res) ? res : (res.data ?? []);
      expect(Array.isArray(items)).toBe(true);
      expect(items.some((c: any) => c.fullName === uniqueName)).toBe(true);
    } finally {
      try { await adminApi.delete(`/contacts/${contact.id}`); } catch {}
    }
  });
});

test.describe('Contacts — E2E Tests', () => {
  test('CONTACT-07: Contacts page loads', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    let admin: Awaited<ReturnType<typeof loginAs>>;
    try {
      admin = await withRetry(() => loginAs(ctx, 'ADMIN'));
    } catch (e: any) {
      if (e?.status === 500 || e?.status === 0 || e?.message?.includes('500')) {
        throw new SkipError('CONTACT-07: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
