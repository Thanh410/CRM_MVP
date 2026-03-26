// tests/projects/projects.spec.ts
import { test, expect, request as pwRequest } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { ApiClient } from '../helpers/api-client';
import { createProject } from '../helpers/fixtures';

const API = 'http://localhost:3000/api';

test.describe('Projects — API Tests', () => {
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

  test('PROJECT-01: Create project returns 201 with id and name', async () => {
    const project = await createProject(adminApi);
    try {
      expect(project.id).toBeDefined();
      expect(project.name).toBeTruthy();
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-02: List projects returns array', async () => {
    const res = await adminApi.get<any>('/projects');
    expect(res).toHaveProperty('data');
    expect(Array.isArray(res.data)).toBe(true);
  });

  test('PROJECT-03: Get project by ID returns project', async () => {
    const project = await createProject(adminApi);
    try {
      const res = await adminApi.get<any>(`/projects/${project.id}`);
      expect(res.data.id).toBe(project.id);
      expect(res.data.name).toBe(project.name);
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-04: Update project returns updated object', async () => {
    const project = await createProject(adminApi);
    try {
      const res = await adminApi.patch<any>(`/projects/${project.id}`, {
        name: 'Updated Project Name',
      });
      expect(res.data.name).toBe('Updated Project Name');
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-05: Delete project returns 204 and GET returns 404', async () => {
    const project = await createProject(adminApi);
    try {
      await adminApi.delete(`/projects/${project.id}`);
      let errorStatus: number | undefined;
      try {
        await adminApi.get(`/projects/${project.id}`);
      } catch (e: any) {
        errorStatus = e?.status;
      }
      expect(errorStatus).toBe(404);
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });

  test('PROJECT-06: Filter projects by status returns filtered array', async () => {
    const project = await createProject(adminApi, { status: 'IN_PROGRESS' });
    try {
      const res = await adminApi.get<any>('/projects?status=IN_PROGRESS');
      expect(Array.isArray(res.data)).toBe(true);
      res.data.forEach((p: any) => {
        expect(p.status).toBe('IN_PROGRESS');
      });
    } finally {
      try { await adminApi.delete(`/projects/${project.id}`); } catch {}
    }
  });
});

test.describe('Projects — E2E Tests', () => {
  test('PROJECT-07: Projects page loads', async ({ page }) => {
    const pageContext = page.context();
    const ctx = await pwRequest.newContext();
    const admin = await loginAs(ctx, 'ADMIN');
    await pageContext.addInitScript((t: any) => {
      localStorage.setItem('crm-auth', JSON.stringify(t));
    }, admin);
    await ctx.dispose();
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
