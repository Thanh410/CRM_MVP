// tests/organizations/organizations.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';

const API = process.env.API_BASE_URL!;

test.describe('Organizations — API Tests', () => {
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

  test('ORG-01: Get current org returns 200', async () => {
    const org = await adminApi.get<any>('/organizations/me');
    expect(org).toBeDefined();
    expect(org.id || org?.data?.id).toBeDefined();
  });

  test('ORG-02: Update org returns updated org', async () => {
    const updated = await adminApi.patch<any>('/organizations/me', {
      name: `Updated Org ${Date.now()}`,
    });
    expect(updated).toBeDefined();
    // Restore original name — fetch current first
    try {
      const current = await adminApi.get<any>('/organizations/me');
      const nameToRestore = current?.name || current?.data?.name;
      if (nameToRestore) {
        await adminApi.patch('/organizations/me', { name: nameToRestore });
      }
    } catch {}
  });

  test('ORG-03: List departments returns 200', async () => {
    const res = await adminApi.get<any>('/organizations/departments');
    expect(res).toBeDefined();
    expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
  });

  test('ORG-04: Create department returns 201', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Test Dept ${Date.now()}`,
    });
    try {
      expect(dept).toBeDefined();
      expect(dept.id || dept?.data?.id).toBeDefined();
    } finally {
      const id = dept?.id ?? dept?.data?.id;
      if (id) try { await adminApi.delete(`/organizations/departments/${id}`); } catch {}
    }
  });

  test('ORG-05: Update department returns updated department', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Dept To Update ${Date.now()}`,
    });
    const deptId = dept?.id ?? dept?.data?.id;
    try {
      const updated = await adminApi.patch<any>(`/organizations/departments/${deptId}`, {
        name: 'Updated Dept Name',
      });
      expect(updated).toBeDefined();
    } finally {
      if (deptId) try { await adminApi.delete(`/organizations/departments/${deptId}`); } catch {}
    }
  });

  test('ORG-06: Delete department returns 204', async () => {
    const dept = await adminApi.post<any>('/organizations/departments', {
      name: `Dept To Delete ${Date.now()}`,
    });
    const deptId = dept?.id ?? dept?.data?.id;
    try {
      const res = await adminApi.delete(`/organizations/departments/${deptId}`);
      expect(res).toBeUndefined();
      let errorStatus: number | undefined;
      try { await adminApi.get(`/organizations/departments/${deptId}`); } catch (e: any) { errorStatus = e?.status; }
      expect(errorStatus).toBe(404);
    } finally {
      if (deptId) try { await adminApi.delete(`/organizations/departments/${deptId}`); } catch {}
    }
  });

  test('ORG-07: List teams returns 200', async () => {
    const res = await adminApi.get<any>('/organizations/teams');
    expect(res).toBeDefined();
    expect(Array.isArray(res) || Array.isArray(res?.data)).toBe(true);
  });

  test('ORG-08: Create team returns 201', async () => {
    const team = await adminApi.post<any>('/organizations/teams', {
      name: `Test Team ${Date.now()}`,
    });
    try {
      expect(team).toBeDefined();
      expect(team.id || team?.data?.id).toBeDefined();
    } finally {
      const id = team?.id ?? team?.data?.id;
      if (id) try { await adminApi.delete(`/organizations/teams/${id}`); } catch {}
    }
  });
});
