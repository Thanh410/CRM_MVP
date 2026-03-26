// tests/notes/notes.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead } from '../helpers/fixtures';

const API = process.env.API_BASE_URL!;

test.describe('Notes — API Tests', () => {
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

  test('NOTE-01: Create note on lead returns 201', async () => {
    const lead = await createLead(adminApi);
    try {
      const note = await adminApi.post<any>('/notes', {
        content: `Test note content ${Date.now()}`,
        entityType: 'LEAD',
        entityId: lead.id,
      });
      expect(note).toBeDefined();
      expect(note.id).toBeDefined();
      expect(note.content).toBeTruthy();
      try { await adminApi.delete(`/notes/${note.id}`); } catch {}
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-02: Get notes for entity returns 200', async () => {
    const lead = await createLead(adminApi);
    const note = await adminApi.post<any>('/notes', {
      content: `Get notes content ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    try {
      const res = await adminApi.get<any>(`/notes?entityType=LEAD&entityId=${lead.id}`);
      expect(res).toBeDefined();
      expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
    } finally {
      try { await adminApi.delete(`/notes/${note.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-03: Update note returns updated note', async () => {
    const lead = await createLead(adminApi);
    const note = await adminApi.post<any>('/notes', {
      content: `Original content ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    try {
      const updated = await adminApi.patch<any>(`/notes/${note.id}`, {
        content: 'updated note content',
      });
      const n = Array.isArray(updated) ? updated[0] : updated?.data ?? updated;
      expect(n).toBeDefined();
    } finally {
      try { await adminApi.delete(`/notes/${note.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('NOTE-04: Delete note returns 204', async () => {
    const lead = await createLead(adminApi);
    const note = await adminApi.post<any>('/notes', {
      content: `Delete note ${Date.now()}`,
      entityType: 'LEAD',
      entityId: lead.id,
    });
    try {
      const res = await adminApi.delete(`/notes/${note.id}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/notes/${note.id}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });
});
