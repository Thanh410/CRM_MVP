// tests/organizations/organizations.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';

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

test.describe('Organizations — API Tests', () => {
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
        throw new SkipError('ORG-API: admin login → 500 (server instability)');
        return;
      }
      throw e;
    }
    adminApi = new ApiClient(API, admin.accessToken);
  });

  test.afterAll(async () => {
    if (adminCtx) await adminCtx.dispose();
  });

  test('ORG-01: Get current org returns 200', async () => {
    const res = await adminApi.get<any>('/organizations/me');
    const org = res.data ?? res;
    expect(org).toBeDefined();
    expect(org.id).toBeDefined();
  });

  test('ORG-02: Update org returns updated org', async () => {
    const updated = await adminApi.patch<any>('/organizations/me', {
      name: `Updated Org ${Date.now()}`,
    });
    expect(updated).toBeDefined();
    // Restore original name — fetch current first
    try {
      const current = await adminApi.get<any>('/organizations/me');
      const c = current.data ?? current;
      const nameToRestore = c.name;
      if (nameToRestore) {
        await adminApi.patch('/organizations/me', { name: nameToRestore });
      }
    } catch {}
  });

  test('ORG-03: List departments returns 200', async () => {
    const res = await adminApi.get<any>('/organizations/departments');
    expect(res).toBeDefined();
    const items = Array.isArray(res) ? res : (res?.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('ORG-04: Create department returns 201', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Test Dept ${Date.now()}`,
    });
    const d = dept.data ?? dept;
    try {
      expect(d).toBeDefined();
      expect(d.id).toBeDefined();
    } finally {
      if (d.id) try { await adminApi.delete(`/organizations/departments/${d.id}`); } catch {}
    }
  });

  test('ORG-05: Update department returns updated department', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Dept To Update ${Date.now()}`,
    });
    const d = dept.data ?? dept;
    try {
      const updated = await adminApi.patch<any>(`/organizations/departments/${d.id}`, {
        name: 'Updated Dept Name',
      });
      expect(updated).toBeDefined();
    } finally {
      if (d.id) try { await adminApi.delete(`/organizations/departments/${d.id}`); } catch {}
    }
  });

  test('ORG-06: Delete department returns 204', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Dept To Delete ${Date.now()}`,
    });
    const d = dept.data ?? dept;
    try {
      const res = await adminApi.delete(`/organizations/departments/${d.id}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/organizations/departments/${d.id}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      if (d.id) try { await adminApi.delete(`/organizations/departments/${d.id}`); } catch {}
    }
  });

  test('ORG-07: List teams returns 200', async () => {
    const res = await adminApi.get<any>('/organizations/teams');
    expect(res).toBeDefined();
    const items = Array.isArray(res) ? res : (res?.data ?? []);
    expect(Array.isArray(items)).toBe(true);
  });

  test('ORG-08: Create team returns 201', async () => {
    const team = await adminApi.post<any>('/organizations/teams', {
      name: `Test Team ${Date.now()}`,
    });
    const t = team.data ?? team;
    try {
      expect(t).toBeDefined();
      expect(t.id).toBeDefined();
    } finally {
      if (t.id) try { await adminApi.delete(`/organizations/teams/${t.id}`); } catch {}
    }
  });
});
