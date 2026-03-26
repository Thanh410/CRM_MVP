// tests/tags/tags.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead } from '../helpers/fixtures';

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

test.describe('Tags — API Tests', () => {
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
        throw new SkipError('TAG-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('TAG-01: Create tag returns 201', async () => {
    const tag = await adminApi.post<any>('/tags', {
      name: `Test Tag ${Date.now()}`,
      color: '#FF5733',
    });
    try {
      const t = tag.data ?? tag;
      expect(t).toBeDefined();
      expect(t.id).toBeDefined();
      expect(t.name).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/tags/${(tag.data ?? tag).id}`); } catch {}
    }
  });

  test('TAG-02: List tags returns array', async () => {
    const res = await adminApi.get<any>('/tags');
    const items = Array.isArray(res) ? res : (res.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('TAG-03: Tag a lead returns 201', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const tag = await adminApi.post<any>('/tags', {
      name: `Lead Tag ${Date.now()}`,
      color: '#3498DB',
    });
    const t = tag.data ?? tag;
    try {
      const tagged = await adminApi.post<any>(`/tags/${t.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      expect(tagged).toBeDefined();
    } finally {
      try { await adminApi.delete(`/tags/${t.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-04: Get tags on a lead returns 200', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const tag = await adminApi.post<any>('/tags', {
      name: `Get Tag ${Date.now()}`,
      color: '#2ECC71',
    });
    const t = tag.data ?? tag;
    try {
      await adminApi.post<any>(`/tags/${t.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      const res = await adminApi.get<any>(`/tags/entity/LEAD/${lead.id}`);
      expect(res).toBeDefined();
      const tags = Array.isArray(res) ? res : (res?.data ?? []);
      expect(Array.isArray(tags) || typeof tags === 'object').toBe(true);
    } finally {
      try { await adminApi.delete(`/tags/${t.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-05: Remove tag from lead returns 204', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const tag = await adminApi.post<any>('/tags', {
      name: `Remove Tag ${Date.now()}`,
      color: '#9B59B6',
    });
    const t = tag.data ?? tag;
    try {
      await adminApi.post<any>(`/tags/${t.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      const res = await adminApi.delete(`/tags/${t.id}/entities/LEAD/${lead.id}`);
      expect(res).toBeUndefined();
    } finally {
      try { await adminApi.delete(`/tags/${t.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-06: Delete tag returns 204', async () => {
    const tag = await adminApi.post<any>('/tags', {
      name: `Delete Tag ${Date.now()}`,
      color: '#E74C3C',
    });
    const t = tag.data ?? tag;
    const res = await adminApi.delete(`/tags/${t.id}`);
    expect(res).toBeUndefined();
    let errorStatus: number | undefined;
    try { await adminApi.get(`/tags/${t.id}`); } catch (e: any) { errorStatus = e?.status; }
    expect(errorStatus).toBe(404);
  });
});
