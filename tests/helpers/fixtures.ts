// tests/helpers/fixtures.ts
import { ApiClient } from './api-client';

export interface TestLead {
  id: string;
  fullName: string;
  email: string;
  status: string;
}

export interface TestContact {
  id: string;
  fullName: string;
  email: string;
}

export interface TestCompany {
  id: string;
  name: string;
}

export interface TestDeal {
  id: string;
  name: string;
  value: string;
  status: string;
}

export interface TestTask {
  id: string;
  title: string;
  status: string;
}

export interface TestProject {
  id: string;
  name: string;
  status: string;
}

export interface TestConversation {
  id: string;
  channel: string;
  status: string;
}

export function newEmail(suffix = '') {
  return `test_${Date.now()}_${Math.random().toString(36).slice(2)}${suffix}@test.com`;
}

export async function createLead(api: ApiClient, overrides: Partial<TestLead> = {}): Promise<TestLead> {
  const payload = {
    fullName: `Test Lead ${Date.now()}`,
    email: newEmail(),
    phone: `090${Date.now().toString().slice(-7)}`,
    source: 'WEBSITE',
    status: 'NEW',
    ...overrides,
  };
  const res = await api.post<{ data: TestLead }>('/leads', payload);
  return res.data;
}

export async function createContact(api: ApiClient, overrides: Partial<TestContact> = {}): Promise<TestContact> {
  const payload = {
    fullName: `Test Contact ${Date.now()}`,
    email: newEmail(),
    phone: `090${Date.now().toString().slice(-7)}`,
    ...overrides,
  };
  const res = await api.post<{ data: TestContact }>('/contacts', payload);
  return res.data;
}

export async function createCompany(api: ApiClient, overrides: Partial<TestCompany> = {}): Promise<TestCompany> {
  const payload = {
    name: `Test Company ${Date.now()}`,
    industry: 'IT',
    size: '11-50',
    ...overrides,
  };
  const res = await api.post<{ data: TestCompany }>('/companies', payload);
  return res.data;
}

export async function createDeal(api: ApiClient, overrides: Partial<TestDeal> = {}): Promise<TestDeal> {
  const payload = {
    name: `Test Deal ${Date.now()}`,
    value: '10000000',
    currency: 'VND',
    status: 'OPEN',
    ...overrides,
  };
  const res = await api.post<{ data: TestDeal }>('/deals', payload);
  return res.data;
}

export async function createTask(api: ApiClient, overrides: Partial<TestTask> = {}): Promise<TestTask> {
  const payload = {
    title: `Test Task ${Date.now()}`,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  };
  const res = await api.post<{ data: TestTask }>('/tasks', payload);
  return res.data;
}

export async function createProject(api: ApiClient, overrides: Partial<TestProject> = {}): Promise<TestProject> {
  const payload = {
    name: `Test Project ${Date.now()}`,
    status: 'PLANNING',
    startDate: new Date().toISOString(),
    ...overrides,
  };
  const res = await api.post<{ data: TestProject }>('/projects', payload);
  return res.data;
}
