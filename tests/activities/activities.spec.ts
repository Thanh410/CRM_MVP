// tests/activities/activities.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createLead } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

test.describe('Activities — API Tests', () => {
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

  test('ACT-01: Log activity on lead returns 201', async () => {
    const lead = await createLead(adminApi);
    try {
      const activity = await adminApi.post<any>('/activities', {
        entityType: 'LEAD',
        entityId: lead.id,
        activityType: 'CALL',
        description: `Test call activity ${Date.now()}`,
      });
      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.activityType).toBe('CALL');
      try { await adminApi.delete(`/activities/${activity.id}`); } catch {}
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('ACT-02: List activities returns 200', async () => {
    const res = await adminApi.get<any>('/activities');
    expect(res).toBeDefined();
    expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
  });

  test('ACT-03: Filter activities by entity returns 200', async () => {
    const lead = await createLead(adminApi);
    const activity = await adminApi.post<any>('/activities', {
      entityType: 'LEAD',
      entityId: lead.id,
      activityType: 'EMAIL',
      description: `Test email activity ${Date.now()}`,
    });
    try {
      const res = await adminApi.get<any>(`/activities?entityType=LEAD&entityId=${lead.id}`);
      expect(res).toBeDefined();
      expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
    } finally {
      try { await adminApi.delete(`/activities/${activity.id}`); } catch {}
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });

  test('ACT-04: Delete activity returns 204', async () => {
    const lead = await createLead(adminApi);
    const activity = await adminApi.post<any>('/activities', {
      entityType: 'LEAD',
      entityId: lead.id,
      activityType: 'MEETING',
      description: `Test meeting activity ${Date.now()}`,
    });
    try {
      const res = await adminApi.delete(`/activities/${activity.id}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/activities/${activity.id}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/leads/${lead.id}`); } catch {}
    }
  });
});
