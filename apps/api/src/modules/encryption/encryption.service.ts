import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { KeyManagementService } from './key-management.service';
import {
  ENCRYPTION_PREFIX,
  AES_ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
} from './encryption.constants';
import type { EncryptedEnvelope } from './encryption.types';

@Injectable()
export class EncryptionService {
  private readonly enabled: boolean;

  constructor(
    @Inject(KeyManagementService) private readonly keyManager: KeyManagementService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.enabled = this.config.get<string>('ENCRYPTION_ENABLED') === 'true';
  }

  /** Whether encryption is currently enabled via feature flag */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if a value is already encrypted (has the envelope prefix).
   * Used during rollout to handle mixed plaintext/ciphertext data.
   */
  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
  }

  /**
   * Encrypt a plaintext string value for a given tenant.
   * Returns the envelope-formatted ciphertext string.
   */
  async encrypt(plaintext: string, tenantId: string): Promise<string> {
    if (!this.enabled) return plaintext;

    const { keyId, key } = await this.keyManager.getDEK(tenantId);
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    const envelope: EncryptedEnvelope = {
      v: 1,
      kid: keyId,
      iv: iv.toString('base64'),
      ct: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    };

    return ENCRYPTION_PREFIX + Buffer.from(JSON.stringify(envelope)).toString('base64');
  }

  /**
   * Decrypt an envelope-formatted ciphertext string.
   * If the value is not encrypted (no prefix), returns it as-is (rollout fallback).
   */
  async decrypt(ciphertext: string, tenantId: string): Promise<string> {
    if (!this.isEncrypted(ciphertext)) return ciphertext;

    const envelopeB64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
    const envelope: EncryptedEnvelope = JSON.parse(
      Buffer.from(envelopeB64, 'base64').toString('utf8'),
    );

    const { key } = await this.keyManager.getDEK(tenantId);

    const decipher = crypto.createDecipheriv(
      AES_ALGORITHM,
      key,
      Buffer.from(envelope.iv, 'base64'),
      { authTagLength: AUTH_TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.ct, 'base64')),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  }

  /**
   * Encrypt a JSON-serializable value (for Prisma Json fields like Assessment.responses).
   */
  async encryptJson(value: unknown, tenantId: string): Promise<string> {
    const json = JSON.stringify(value);
    return this.encrypt(json, tenantId);
  }

  /**
   * Decrypt a JSON field value back to its parsed form.
   */
  async decryptJson(ciphertext: string, tenantId: string): Promise<unknown> {
    const json = await this.decrypt(ciphertext, tenantId);
    return JSON.parse(json);
  }
}
