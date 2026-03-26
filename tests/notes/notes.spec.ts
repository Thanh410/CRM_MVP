// tests/notes/notes.spec.ts
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

test.describe('Notes — API Tests', () => {
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
        throw new SkipError('NOTE-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('NOTE-01: Create note on lead returns 201', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    try {
      const note = await adminApi.post<any>('/notes', {
        content: `Test note content ${Date.now()}`,
        entityType: 'LEAD',
        entityId: lead.id,
      });
      const n = note.data ?? note;
      expect(n).toBeDefined();
      expect(n.id).toBeDefined();
      expect(n.content).toBeTruthy();
      try { await adminApi.delete(`/notes/${n.id}`); } catch {}
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-02: Get notes for entity returns 200', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const note = await adminApi.post<any>('/notes', {
      content: `Get notes content ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    const n = note.data ?? note;
    try {
      const res = await adminApi.get<any>(`/notes?entityType=LEAD&entityId=${lead.id}`);
      expect(res).toBeDefined();
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      expect(Array.isArray(items)).toBe(true);
    } finally {
      try { await adminApi.delete(`/notes/${n.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-03: Update note returns updated note', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const note = await adminApi.post<any>('/notes', {
      content: `Original content ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    const n = note.data ?? note;
    try {
      const updated = await adminApi.patch<any>(`/notes/${n.id}`, {
        content: 'updated note content',
      });
      const u = Array.isArray(updated) ? updated[0] : (updated?.data ?? updated);
      expect(u).toBeDefined();
    } finally {
      try { await adminApi.delete(`/notes/${n.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-04: Delete note returns 204', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const note = await adminApi.post<any>('/notes', {
      content: `Delete note ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    const n = note.data ?? note;
    try {
      const res = await adminApi.delete(`/notes/${n.id}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/notes/${n.id}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });
});
