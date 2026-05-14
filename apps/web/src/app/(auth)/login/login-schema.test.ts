import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate schema từ login page (giữ source of truth)
const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  rememberMe: z.boolean().default(false),
});

describe('Login form schema', () => {
  describe('email validation', () => {
    it('reject email không hợp lệ', () => {
      const result = loginSchema.safeParse({ email: 'not-an-email', password: '123456' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Email không hợp lệ');
      }
    });

    it('reject email rỗng', () => {
      const result = loginSchema.safeParse({ email: '', password: '123456' });
      expect(result.success).toBe(false);
    });

    it('accept email hợp lệ', () => {
      const result = loginSchema.safeParse({
        email: 'sales@abc.com.vn',
        password: 'Admin@123',
      });
      expect(result.success).toBe(true);
    });

    it('accept email với subdomain', () => {
      const result = loginSchema.safeParse({
        email: 'user@mail.company.vn',
        password: 'Admin@123',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('password validation', () => {
    it('reject password < 6 ký tự', () => {
      const result = loginSchema.safeParse({ email: 'x@x.vn', password: '12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Mật khẩu tối thiểu 6 ký tự');
      }
    });

    it('reject password rỗng', () => {
      const result = loginSchema.safeParse({ email: 'x@x.vn', password: '' });
      expect(result.success).toBe(false);
    });

    it('accept password >= 6 ký tự', () => {
      expect(loginSchema.safeParse({ email: 'x@x.vn', password: '123456' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'x@x.vn', password: 'Admin@123456' }).success).toBe(true);
    });

    it('accept password có ký tự đặc biệt + tiếng Việt', () => {
      const result = loginSchema.safeParse({
        email: 'x@x.vn',
        password: 'Mật-Khẩu@123!',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('rememberMe', () => {
    it('default false khi không truyền', () => {
      const result = loginSchema.parse({ email: 'x@x.vn', password: '123456' });
      expect(result.rememberMe).toBe(false);
    });

    it('accept true/false explicitly', () => {
      expect(loginSchema.parse({ email: 'x@x.vn', password: '123456', rememberMe: true }).rememberMe).toBe(true);
      expect(loginSchema.parse({ email: 'x@x.vn', password: '123456', rememberMe: false }).rememberMe).toBe(false);
    });

    it('reject string thay vì boolean', () => {
      const result = loginSchema.safeParse({
        email: 'x@x.vn',
        password: '123456',
        rememberMe: 'yes' as any,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('multiple errors', () => {
    it('trả về tất cả errors khi nhiều field sai', () => {
      const result = loginSchema.safeParse({ email: 'bad', password: '1' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2);
        const messages = result.error.issues.map((i) => i.message);
        expect(messages).toContain('Email không hợp lệ');
        expect(messages).toContain('Mật khẩu tối thiểu 6 ký tự');
      }
    });
  });
});
