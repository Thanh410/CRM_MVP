import { validateConfig } from './validate-config';

const validEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'a'.repeat(40),
  JWT_REFRESH_SECRET: 'b'.repeat(40),
  ENCRYPTION_KEY: 'c'.repeat(64),
  POSTGRES_PASSWORD: 'StrongP@ssw0rd!',
};

describe('validateConfig', () => {
  describe('development mode', () => {
    it('cho phép tất cả default values trong development', () => {
      expect(() =>
        validateConfig({
          NODE_ENV: 'development',
          JWT_SECRET: 'change_me',
          JWT_REFRESH_SECRET: 'change_me_refresh',
          ENCRYPTION_KEY: '00000000000000000000000000000000',
          POSTGRES_PASSWORD: 'crm_password_change_me',
        }),
      ).not.toThrow();
    });

    it('cho phép missing values trong development', () => {
      expect(() => validateConfig({ NODE_ENV: 'development' })).not.toThrow();
    });
  });

  describe('production mode — JWT_SECRET', () => {
    it('throw nếu JWT_SECRET = "change_me"', () => {
      expect(() => validateConfig({ ...validEnv, JWT_SECRET: 'change_me' }))
        .toThrow(/JWT_SECRET/);
    });

    it('throw nếu JWT_SECRET rỗng', () => {
      expect(() => validateConfig({ ...validEnv, JWT_SECRET: '' }))
        .toThrow(/JWT_SECRET/);
    });

    it('throw nếu JWT_SECRET < 32 ký tự', () => {
      expect(() => validateConfig({ ...validEnv, JWT_SECRET: 'short' }))
        .toThrow(/at least 32 characters/);
    });

    it('throw nếu JWT_SECRET === JWT_REFRESH_SECRET', () => {
      const same = 'a'.repeat(40);
      expect(() => validateConfig({ ...validEnv, JWT_SECRET: same, JWT_REFRESH_SECRET: same }))
        .toThrow(/must be different/);
    });
  });

  describe('production mode — ENCRYPTION_KEY', () => {
    it('throw nếu ENCRYPTION_KEY là default zeros', () => {
      expect(() => validateConfig({
        ...validEnv,
        ENCRYPTION_KEY: '00000000000000000000000000000000',
      })).toThrow(/ENCRYPTION_KEY/);
    });

    it('throw nếu ENCRYPTION_KEY rỗng', () => {
      expect(() => validateConfig({ ...validEnv, ENCRYPTION_KEY: '' }))
        .toThrow(/ENCRYPTION_KEY/);
    });
  });

  describe('production mode — POSTGRES_PASSWORD', () => {
    it('throw nếu POSTGRES_PASSWORD là default', () => {
      expect(() => validateConfig({
        ...validEnv,
        POSTGRES_PASSWORD: 'crm_password_change_me',
      })).toThrow(/POSTGRES_PASSWORD/);
    });

    it('throw nếu POSTGRES_PASSWORD rỗng', () => {
      expect(() => validateConfig({ ...validEnv, POSTGRES_PASSWORD: '' }))
        .toThrow(/POSTGRES_PASSWORD/);
    });
  });

  describe('production mode — happy path', () => {
    it('pass khi tất cả secrets hợp lệ', () => {
      expect(() => validateConfig(validEnv)).not.toThrow();
    });

    it('trả về env nguyên vẹn (không mutate)', () => {
      const result = validateConfig(validEnv);
      expect(result).toBe(validEnv);
    });
  });

  describe('error message format', () => {
    it('list tất cả errors trong 1 throw', () => {
      try {
        validateConfig({
          NODE_ENV: 'production',
          JWT_SECRET: '',
          JWT_REFRESH_SECRET: '',
          ENCRYPTION_KEY: '',
          POSTGRES_PASSWORD: '',
        });
        fail('Expected throw');
      } catch (err: any) {
        // Phải có nhiều lỗi cùng lúc, không chỉ lỗi đầu tiên
        expect(err.message).toMatch(/JWT_SECRET/);
        expect(err.message).toMatch(/JWT_REFRESH_SECRET/);
        expect(err.message).toMatch(/ENCRYPTION_KEY/);
        expect(err.message).toMatch(/POSTGRES_PASSWORD/);
      }
    });

    it('gợi ý cách generate secret', () => {
      try {
        validateConfig({ ...validEnv, JWT_SECRET: 'change_me' });
        fail('Expected throw');
      } catch (err: any) {
        expect(err.message).toMatch(/openssl rand -hex 32/);
      }
    });
  });
});
