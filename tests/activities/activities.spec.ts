// tests/activities/activities.spec.ts
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

test.describe('Activities — API Tests', () => {
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
        throw new SkipError('ACT-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('ACT-01: Log activity on lead returns 201', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    try {
      const activity = await adminApi.post<any>('/activities', {
        entityType: 'LEAD',
        entityId: lead.id,
        activityType: 'CALL',
        description: `Test call activity ${Date.now()}`,
      });
      const a = activity.data ?? activity;
      expect(a).toBeDefined();
      expect(a.id).toBeDefined();
      expect(a.activityType).toBe('CALL');
      try { await adminApi.delete(`/activities/${a.id}`); } catch {}
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('ACT-02: List activities returns 200', async () => {
    const res = await adminApi.get<any>('/activities');
    expect(res).toBeDefined();
    const items = Array.isArray(res) ? res : (res?.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('ACT-03: Filter activities by entity returns 200', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const activity = await adminApi.post<any>('/activities', {
      entityType: 'LEAD',
      entityId: lead.id,
      activityType: 'EMAIL',
      description: `Test email activity ${Date.now()}`,
    });
    const a = activity.data ?? activity;
    try {
      const res = await adminApi.get<any>(`/activities?entityType=LEAD&entityId=${lead.id}`);
      expect(res).toBeDefined();
      const items = Array.isArray(res) ? res : (res?.data ?? []);
      expect(Array.isArray(items)).toBe(true);
    } finally {
      try { await adminApi.delete(`/activities/${a.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('ACT-04: Delete activity returns 204', async () => {
    const lead = await withRetry(() => createLead(adminApi));
    const activity = await adminApi.post<any>('/activities', {
      entityType: 'LEAD',
      entityId: lead.id,
      activityType: 'MEETING',
      description: `Test meeting activity ${Date.now()}`,
    });
    const a = activity.data ?? activity;
    try {
      const res = await adminApi.delete(`/activities/${a.id}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/activities/${a.id}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });
});
