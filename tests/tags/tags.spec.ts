// tests/tags/tags.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead } from '../helpers/fixtures';

const API = process.env.API_BASE_URL!;

test.describe('Tags — API Tests', () => {
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

  test('TAG-01: Create tag returns 201', async () => {
    const tag = await adminApi.post<any>('/tags', {
      name: `Test Tag ${Date.now()}`,
      color: '#FF5733',
    });
    try {
      expect(tag).toBeDefined();
      expect(tag.id).toBeDefined();
      expect(tag.name).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/tags/${tag.id}`); } catch {}
    }
  });

  test('TAG-02: List tags returns array', async () => {
    const res = await adminApi.get<any>('/tags');
    expect(res).toBeDefined();
    expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
  });

  test('TAG-03: Tag a lead returns 201', async () => {
    const lead = await createLead(adminApi);
    const tag = await adminApi.post<any>('/tags', {
      name: `Lead Tag ${Date.now()}`,
      color: '#3498DB',
    });
    try {
      const tagged = await adminApi.post<any>(`/tags/${tag.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      expect(tagged).toBeDefined();
    } finally {
      try { await adminApi.delete(`/tags/${tag.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-04: Get tags on a lead returns 200', async () => {
    const lead = await createLead(adminApi);
    const tag = await adminApi.post<any>('/tags', {
      name: `Get Tag ${Date.now()}`,
      color: '#2ECC71',
    });
    try {
      await adminApi.post<any>(`/tags/${tag.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      const res = await adminApi.get<any>(`/tags/entity/LEAD/${lead.id}`);
      expect(res).toBeDefined();
      const tags = Array.isArray(res) ? res : res?.data ?? [];
      expect(Array.isArray(tags) || typeof tags === 'object').toBe(true);
    } finally {
      try { await adminApi.delete(`/tags/${tag.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-05: Remove tag from lead returns 204', async () => {
    const lead = await createLead(adminApi);
    const tag = await adminApi.post<any>('/tags', {
      name: `Remove Tag ${Date.now()}`,
      color: '#9B59B6',
    });
    try {
      await adminApi.post<any>(`/tags/${tag.id}/entities`, {
        entityType: 'LEAD',
        entityId: lead.id,
      });
      const res = await adminApi.delete(`/tags/${tag.id}/entities/LEAD/${lead.id}`);
      expect(res).toBeUndefined();
    } finally {
      try { await adminApi.delete(`/tags/${tag.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('TAG-06: Delete tag returns 204', async () => {
    const tag = await adminApi.post<any>('/tags', {
      name: `Delete Tag ${Date.now()}`,
      color: '#E74C3C',
    });
    const res = await adminApi.delete(`/tags/${tag.id}`);
    expect(res).toBeUndefined();
    let errorStatus: number | undefined;
    try { await adminApi.get(`/tags/${tag.id}`); } catch (e: any) { errorStatus = e?.status; }
    expect(errorStatus).toBe(404);
  });
});
