import { test, expect, request as pwRequest } from '@playwright/test';

const API = 'http://localhost:3000/api';

test.describe('Rate Limiting Tests', () => {
  // THROTTLE-01: Login rate limit — 10 failed logins succeed (200/401), 11th returns 429
  test('THROTTLE-01: 10 failed login attempts succeed, 11th returns 429', async () => {
    const ctx = await pwRequest.newContext();
    try {
      let res: any;
      for (let i = 1; i <= 10; i++) {
        res = await ctx.post(`${API}/auth/login`, {
          data: {
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          },
        });
        expect([200, 401]).toContain(res.status());
      }
      const res11 = await ctx.post(`${API}/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });
      expect(res11.status()).toBe(429);
    } finally {
      await ctx.dispose();
    }
  });

  // THROTTLE-02: Forgot password rate limit — 3 requests OK (200), 4th returns 429
  test('THROTTLE-02: 3 forgot-password requests succeed, 4th returns 429', async () => {
    const ctx = await pwRequest.newContext();
    try {
      let res: any;
      for (let i = 1; i <= 3; i++) {
        res = await ctx.post(`${API}/auth/forgot-password`, {
          data: {
            email: 'rate-limit-test@example.com',
          },
        });
        expect(res.status()).toBe(200);
      }
      const res4 = await ctx.post(`${API}/auth/forgot-password`, {
        data: {
          email: 'rate-limit-test@example.com',
        },
      });
      expect(res4.status()).toBe(429);
    } finally {
      await ctx.dispose();
    }
  });
});
