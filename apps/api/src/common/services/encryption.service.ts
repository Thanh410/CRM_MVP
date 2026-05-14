import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * AES-256-GCM encryption service for sensitive data at rest.
 * Used for channel credentials (Zalo accessToken, Messenger pageAccessToken)
 * and any PII that must be encrypted in the database.
 *
 * Format of encrypted output (base64):
 *   iv(12) || authTag(16) || ciphertext
 */
@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger(EncryptionService.name);
  private key!: Buffer;
  private readonly algo = 'aes-256-gcm';
  private readonly ivLen = 12;
  private readonly tagLen = 16;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('encryption.key') ?? '';

    if (!raw || raw === '00000000000000000000000000000000') {
      const isProd = this.config.get<string>('nodeEnv') === 'production';
      const msg = 'ENCRYPTION_KEY is missing or using default value';
      if (isProd) throw new Error(msg + ' — refusing to start in production');
      this.logger.warn(msg + ' — using INSECURE dev key, do NOT use in production');
    }

    // Derive 32-byte key from input (supports hex string, base64, or plain text)
    this.key = this.deriveKey(raw || 'dev-only-insecure-key');
  }

  private deriveKey(input: string): Buffer {
    // If 64 hex chars, decode as hex
    if (/^[0-9a-fA-F]{64}$/.test(input)) return Buffer.from(input, 'hex');
    // If 44 base64 chars, decode as base64
    if (/^[A-Za-z0-9+/]{43}=$/.test(input)) return Buffer.from(input, 'base64');
    // Otherwise SHA256 hash to get 32 bytes
    return crypto.createHash('sha256').update(input).digest();
  }

  /**
   * Encrypt a JSON-serializable value. Returns base64 string.
   */
  encrypt(value: unknown): string {
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8');
    const iv = crypto.randomBytes(this.ivLen);
    const cipher = crypto.createCipheriv(this.algo, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
  }

  /**
   * Decrypt a base64 string back to original value. Returns null if invalid.
   */
  decrypt<T = any>(encoded: string): T | null {
    try {
      const buf = Buffer.from(encoded, 'base64');
      if (buf.length < this.ivLen + this.tagLen) return null;
      const iv = buf.subarray(0, this.ivLen);
      const tag = buf.subarray(this.ivLen, this.ivLen + this.tagLen);
      const ciphertext = buf.subarray(this.ivLen + this.tagLen);
      const decipher = crypto.createDecipheriv(this.algo, this.key, iv);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(plaintext.toString('utf8')) as T;
    } catch (err) {
      this.logger.warn(`Decryption failed: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Best-effort decrypt: if the value is plaintext JSON (legacy data),
   * return it as-is. Allows gradual migration.
   */
  decryptOrPassthrough<T = any>(value: any): T | null {
    if (value == null) return null;
    if (typeof value === 'object') return value as T; // already plaintext JSON
    if (typeof value !== 'string') return null;
    const decrypted = this.decrypt<T>(value);
    if (decrypted !== null) return decrypted;
    // Fallback: maybe it's a JSON string (legacy)
    try { return JSON.parse(value) as T; } catch { return null; }
  }
}
