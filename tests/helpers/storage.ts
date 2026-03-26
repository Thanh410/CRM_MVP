// tests/helpers/storage.ts
import { Page } from '@playwright/test';
import { AuthTokens } from './auth';

/**
 * Seed browser localStorage với auth tokens — dùng cho E2E tests
 * mà không cần đi qua login UI
 */
export function seedAuthStorage(page: Page, tokens: AuthTokens) {
  return page.context().addInitScript(({ accessToken, refreshToken, user }) => {
    localStorage.setItem('crm-auth', JSON.stringify({ accessToken, refreshToken, user }));
  }, tokens);
}
