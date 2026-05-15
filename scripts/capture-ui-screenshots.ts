/**
 * Auto-capture screenshots toàn bộ giao diện CRM cho documentation.
 *
 * Yêu cầu:
 *   - Dev stack đang chạy: docker compose up -d && pnpm dev
 *   - Đã seed demo users với password Admin@123456
 *
 * Cài đặt + chạy:
 *   pnpm add -D -w playwright @playwright/test
 *   npx playwright install chromium
 *   pnpm tsx scripts/capture-ui-screenshots.ts
 *
 * Output: docs/ui/screenshots/*.png (full-page screenshots)
 */
import { chromium, Page } from 'playwright';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const BASE_URL = process.env.WEB_URL ?? 'http://localhost:3001';
const EMAIL = process.env.DEMO_EMAIL ?? 'superadmin@abc.com.vn';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'Admin@123456';

const OUT_DIR = path.join(__dirname, '..', 'docs', 'ui', 'screenshots');

interface Shot {
  name: string;
  path: string;
  description: string;
  theme?: 'light' | 'dark';
  viewport?: { width: number; height: number };
  setup?: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  // ── Auth ──────────────────────────────────────────────
  {
    name: '01-login-light',
    path: '/login',
    description: 'Login page (light theme)',
    theme: 'light',
  },
  {
    name: '02-login-dark',
    path: '/login',
    description: 'Login page (dark theme)',
    theme: 'dark',
  },
  // ── Dashboard ─────────────────────────────────────────
  {
    name: '10-dashboard-light',
    path: '/dashboard',
    description: 'Tổng quan — stat cards với sparkline, funnel, pie chart',
    theme: 'light',
  },
  {
    name: '11-dashboard-dark',
    path: '/dashboard',
    description: 'Tổng quan (dark mode)',
    theme: 'dark',
  },
  // ── Leads ─────────────────────────────────────────────
  {
    name: '20-leads-list',
    path: '/leads',
    description: 'Danh sách leads — table với avatar màu seeded, sort, filter',
  },
  {
    name: '21-leads-bulk-actions',
    path: '/leads',
    description: 'Bulk actions bar khi chọn nhiều leads',
    setup: async (page) => {
      // Click row checkboxes nếu có
      const checkboxes = page.locator('tbody input[type="checkbox"]');
      const count = await checkboxes.count();
      if (count >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();
      }
    },
  },
  {
    name: '22-leads-create-modal',
    path: '/leads',
    description: 'Modal tạo lead mới',
    setup: async (page) => {
      await page.getByRole('button', { name: /Thêm lead/i }).first().click();
      await page.waitForTimeout(300);
    },
  },
  {
    name: '23-leads-empty',
    path: '/leads?status=NONEXISTENT_STATUS',
    description: 'Empty state với hints + 2 CTAs',
  },
  // ── Contacts ──────────────────────────────────────────
  {
    name: '30-contacts-list',
    path: '/contacts',
    description: 'Danh sách contacts',
  },
  // ── Companies ─────────────────────────────────────────
  {
    name: '40-companies-list',
    path: '/companies',
    description: 'Danh sách công ty',
  },
  // ── Deals (Kanban) ────────────────────────────────────
  {
    name: '50-deals-kanban',
    path: '/deals',
    description: 'Kanban pipeline với filter pills + compact value',
  },
  {
    name: '51-deals-filter-overdue',
    path: '/deals',
    description: 'Filter Quá hạn',
    setup: async (page) => {
      await page.getByRole('button', { name: 'Quá hạn' }).click();
      await page.waitForTimeout(200);
    },
  },
  // ── Tasks ─────────────────────────────────────────────
  {
    name: '60-tasks-kanban',
    path: '/tasks',
    description: 'Kanban nhiệm vụ',
  },
  // ── Marketing ─────────────────────────────────────────
  {
    name: '70-marketing-campaigns',
    path: '/marketing',
    description: 'Marketing campaigns',
  },
  // ── Inbox ─────────────────────────────────────────────
  {
    name: '80-inbox',
    path: '/inbox',
    description: 'Omnichannel inbox',
  },
  // ── Settings ──────────────────────────────────────────
  {
    name: '90-settings-org',
    path: '/settings',
    description: 'Settings: tab Tổ chức',
  },
  {
    name: '91-settings-rbac',
    path: '/settings',
    description: 'Settings: RBAC matrix view',
    setup: async (page) => {
      await page.getByRole('button', { name: /Phân quyền|RBAC/i }).click();
      await page.waitForTimeout(200);
      // Select SUPER_ADMIN role
      const firstRole = page.locator('[class*="bg-zinc-50"] button').first();
      if (await firstRole.count() > 0) await firstRole.click();
      await page.waitForTimeout(200);
    },
  },
  // ── Users ─────────────────────────────────────────────
  {
    name: 'A0-users',
    path: '/users',
    description: 'Quản lý người dùng',
  },
  // ── Audit ─────────────────────────────────────────────
  {
    name: 'B0-audit',
    path: '/audit',
    description: 'Nhật ký hệ thống',
  },
  // ── Command Palette ───────────────────────────────────
  {
    name: 'C0-command-palette',
    path: '/dashboard',
    description: 'Command Palette (Cmd+K)',
    setup: async (page) => {
      await page.keyboard.press('Control+K');
      await page.waitForTimeout(300);
    },
  },
  // ── Keyboard Shortcuts ────────────────────────────────
  {
    name: 'C1-keyboard-shortcuts',
    path: '/dashboard',
    description: 'Keyboard shortcuts modal (?)',
    setup: async (page) => {
      await page.keyboard.press('?');
      await page.waitForTimeout(300);
    },
  },
  // ── Mobile view ───────────────────────────────────────
  {
    name: 'M0-leads-mobile',
    path: '/leads',
    description: 'Leads trên mobile (iPhone 14)',
    viewport: { width: 390, height: 844 },
  },
  {
    name: 'M1-dashboard-mobile',
    path: '/dashboard',
    description: 'Dashboard trên mobile',
    viewport: { width: 390, height: 844 },
  },
];

async function setTheme(page: Page, theme: 'light' | 'dark') {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
  }, theme);
  await page.waitForTimeout(150);
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log(`📁 Output: ${OUT_DIR}\n`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // retina-quality
    locale: 'vi-VN',
  });

  const page = await ctx.newPage();

  try {
    console.log('🔐 Logging in...');
    await login(page);
    console.log('   ✓ Logged in\n');

    for (const shot of SHOTS) {
      const startTime = Date.now();
      try {
        if (shot.viewport) {
          await page.setViewportSize(shot.viewport);
        } else {
          await page.setViewportSize({ width: 1440, height: 900 });
        }

        await page.goto(`${BASE_URL}${shot.path}`, { waitUntil: 'networkidle', timeout: 20_000 });

        if (shot.theme) await setTheme(page, shot.theme);

        if (shot.setup) await shot.setup(page);

        // Wait extra for any animations
        await page.waitForTimeout(500);

        const out = path.join(OUT_DIR, `${shot.name}.png`);
        await page.screenshot({ path: out, fullPage: true });
        const ms = Date.now() - startTime;
        console.log(`   ✓ ${shot.name}.png (${ms}ms) — ${shot.description}`);
      } catch (err) {
        console.log(`   ✗ ${shot.name}: ${(err as Error).message}`);
      }
    }

    console.log(`\n✅ Done. Saved ${SHOTS.length} screenshots to ${OUT_DIR}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
