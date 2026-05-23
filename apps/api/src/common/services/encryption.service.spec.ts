import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  async function build(envKey?: string, nodeEnv = 'development') {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'encryption.key') return envKey ?? 'test-key-1234567890abcdef-do-not-use';
        if (key === 'nodeEnv') return nodeEnv;
        return undefined;
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    const s = module.get(EncryptionService);
    s.onModuleInit();
    return s;
  }

  beforeEach(async () => {
    service = await build();
  });

  describe('encrypt + decrypt', () => {
    it('round-trips a JSON object', () => {
      const original = { accessToken: 'zalo_secret_token', userId: 'oa-12345' };
      const encrypted = service.encrypt(original);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).not.toContain('zalo_secret_token');
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+$/); // base64
      expect(decrypted).toEqual(original);
    });

    it('produces different ciphertext mỗi lần (random IV)', () => {
      const value = { a: 1 };
      const c1 = service.encrypt(value);
      const c2 = service.encrypt(value);

      expect(c1).not.toEqual(c2);
      expect(service.decrypt(c1)).toEqual(value);
      expect(service.decrypt(c2)).toEqual(value);
    });

    it('encrypt nested object + array', () => {
      const value = { tokens: ['a', 'b'], meta: { exp: 12345 } };
      expect(service.decrypt(service.encrypt(value))).toEqual(value);
    });

    it('encrypt primitive values', () => {
      expect(service.decrypt<string>(service.encrypt('hello'))).toBe('hello');
      expect(service.decrypt<number>(service.encrypt(42))).toBe(42);
      expect(service.decrypt<boolean>(service.encrypt(true))).toBe(true);
    });

    it('decrypt với key sai trả về null (không throw)', async () => {
      const encrypted = service.encrypt({ secret: 'x' });
      const other = await build('completely-different-key-for-test');
      expect(other.decrypt(encrypted)).toBeNull();
    });

    it('decrypt với ciphertext bị tampered trả về null (auth tag verify)', () => {
      const encrypted = service.encrypt({ a: 1 });
      const buf = Buffer.from(encrypted, 'base64');
      buf[buf.length - 1] ^= 0xff; // flip last byte
      const tampered = buf.toString('base64');
      expect(service.decrypt(tampered)).toBeNull();
    });

    it('decrypt với input quá ngắn trả về null', () => {
      expect(service.decrypt('short')).toBeNull();
    });
  });

  describe('decryptOrPassthrough', () => {
    it('decrypt giá trị đã encrypted', () => {
      const value = { accessToken: 'secret' };
      const encrypted = service.encrypt(value);
      expect(service.decryptOrPassthrough(encrypted)).toEqual(value);
    });

    it('trả về object plaintext nếu input là object (legacy data)', () => {
      const legacy = { accessToken: 'plaintext_token' };
      expect(service.decryptOrPassthrough(legacy)).toEqual(legacy);
    });

    it('parse JSON string nếu không phải encrypted (legacy data)', () => {
      const json = '{"accessToken":"plain"}';
      expect(service.decryptOrPassthrough(json)).toEqual({ accessToken: 'plain' });
    });

    it('trả về null nếu input là null hoặc undefined', () => {
      expect(service.decryptOrPassthrough(null)).toBeNull();
      expect(service.decryptOrPassthrough(undefined)).toBeNull();
    });
  });

  describe('Key derivation', () => {
    it('chấp nhận 64-char hex key', async () => {
      const hex = 'a'.repeat(64);
      const s = await build(hex);
      const enc = s.encrypt({ a: 1 });
      expect(s.decrypt(enc)).toEqual({ a: 1 });
    });

    it('chấp nhận 44-char base64 key (32 bytes)', async () => {
      const b64 = Buffer.alloc(32, 'b').toString('base64');
      const s = await build(b64);
      const enc = s.encrypt({ a: 1 });
      expect(s.decrypt(enc)).toEqual({ a: 1 });
    });

    it('hash plain text key qua SHA256 để derive 32 bytes', async () => {
      const s = await build('any-password-text-not-hex-or-base64');
      const enc = s.encrypt({ a: 1 });
      expect(s.decrypt(enc)).toEqual({ a: 1 });
    });
  });

  describe('Production safety', () => {
    it('throw error nếu missing key trong production', async () => {
      await expect(build('', 'production')).rejects.toThrow(/ENCRYPTION_KEY/);
    });

    it('throw error nếu dùng default key trong production', async () => {
      await expect(build('00000000000000000000000000000000', 'production')).rejects.toThrow(/ENCRYPTION_KEY/);
    });

    it('cho phép missing key trong dev (warn only)', async () => {
      const s = await build('', 'development');
      expect(s).toBeDefined();
    });
  });
});
