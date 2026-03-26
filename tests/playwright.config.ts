// tests/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'path';

// Load test env vars
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const BASE_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';
const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: BASE_URL,
    apiBaseURL: API_BASE,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
  ],
  timeout: 60_000,
  // NOTE: webServer intentionally omitted — services are started manually or by CI workflow.
});
