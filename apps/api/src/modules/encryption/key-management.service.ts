import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { KMSClient, GenerateDataKeyCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { PrismaService } from '../../prisma/prisma.service';
import { KEY_LENGTH, AES_ALGORITHM, IV_LENGTH, AUTH_TAG_LENGTH } from './encryption.constants';
import type { ResolvedDEK, CachedDEK, EncryptionProvider } from './encryption.types';

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly cache = new Map<string, CachedDEK>();
  private readonly cacheTtlMs: number;
  private readonly provider: EncryptionProvider;
  private readonly masterKey: Buffer | null;
  private kmsClient: KMSClient | null = null;
  private kmsKeyArn: string | null = null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {
    this.provider = (this.config.get<string>('ENCRYPTION_PROVIDER') ??
      'local') as EncryptionProvider;
    this.cacheTtlMs = parseInt(
      this.config.get<string>('ENCRYPTION_DEK_CACHE_TTL_MS') ?? '900000',
      10,
    );

    const masterKeyHex = this.config.get<string>('ENCRYPTION_MASTER_KEY');
    this.masterKey = masterKeyHex ? Buffer.from(masterKeyHex, 'hex') : null;
  }

  onModuleInit(): void {
    if (this.provider === 'kms') {
      const region = this.config.getOrThrow<string>('AWS_REGION');
      this.kmsKeyArn = this.config.getOrThrow<string>('AWS_KMS_KEY_ARN');
      this.kmsClient = new KMSClient({ region });
    }
  }

  /**
   * Get the DEK for a tenant. Returns cached version if available and not expired.
   * If no DEK exists for the tenant, generates a new one.
   */
  async getDEK(tenantId: string): Promise<ResolvedDEK> {
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      return { keyId: cached.keyId, key: cached.key };
    }

    // Look up active key from database
    const keyRecord = await this.prisma.encryptionKey.findFirst({
      where: { tenantId, isActive: true },
      orderBy: { keyVersion: 'desc' },
    });

    if (keyRecord) {
      const key = await this.unwrapDEK(keyRecord.encryptedDek);
      const resolved: ResolvedDEK = { keyId: keyRecord.id, key };
      this.cacheKey(tenantId, resolved);
      return resolved;
    }

    // No key exists — generate a new one
    return this.generateDEK(tenantId);
  }

  /**
   * Generate a new DEK for a tenant and persist the wrapped version.
   */
  async generateDEK(tenantId: string): Promise<ResolvedDEK> {
    let plaintext: Buffer;
    let encryptedDek: string;
    let kmsKeyArn: string | null = null;

    if (this.provider === 'kms') {
      const result = await this.generateViaKMS();
      plaintext = result.plaintext;
      encryptedDek = result.encryptedDek;
      kmsKeyArn = this.kmsKeyArn;
    } else {
      plaintext = crypto.randomBytes(KEY_LENGTH);
      encryptedDek = this.wrapLocal(plaintext);
    }

    // Determine the next version number
    const latestKey = await this.prisma.encryptionKey.findFirst({
      where: { tenantId },
      orderBy: { keyVersion: 'desc' },
      select: { keyVersion: true },
    });
    const nextVersion = (latestKey?.keyVersion ?? 0) + 1;

    const record = await this.prisma.encryptionKey.create({
      data: {
        tenantId,
        encryptedDek,
        keyVersion: nextVersion,
        isActive: true,
        algorithm: 'AES-256-GCM',
        kmsKeyArn,
      },
    });

    const resolved: ResolvedDEK = { keyId: record.id, key: plaintext };
    this.cacheKey(tenantId, resolved);
    return resolved;
  }

  /**
   * Rotate the DEK for a tenant: generate a new active key and deactivate the old one.
   */
  async rotateDEK(tenantId: string): Promise<ResolvedDEK> {
    // Deactivate current active key(s)
    await this.prisma.encryptionKey.updateMany({
      where: { tenantId, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    });

    // Clear cache so next getDEK generates fresh
    this.cache.delete(tenantId);

    return this.generateDEK(tenantId);
  }

  /** Evict a tenant's cached DEK (useful for testing or forced refresh) */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.cache.delete(tenantId);
    } else {
      this.cache.clear();
    }
  }

  // ── Private helpers ──────────────────────────────────

  private cacheKey(tenantId: string, resolved: ResolvedDEK): void {
    this.cache.set(tenantId, {
      ...resolved,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  /**
   * Unwrap an encrypted DEK using the configured provider.
   */
  private async unwrapDEK(encryptedDek: string): Promise<Buffer> {
    if (this.provider === 'kms') {
      return this.unwrapViaKMS(encryptedDek);
    }
    return this.unwrapLocal(encryptedDek);
  }

  // ── Local provider (dev/test) ──────────────────────

  /**
   * Wrap a DEK using the local master key (AES-256-GCM).
   * Format: base64(iv + authTag + ciphertext)
   */
  private wrapLocal(plaintext: Buffer): string {
    if (!this.masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY is required when ENCRYPTION_PROVIDER=local');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(AES_ALGORITHM, this.masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });

    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  /**
   * Unwrap a DEK using the local master key.
   */
  private unwrapLocal(wrapped: string): Buffer {
    if (!this.masterKey) {
      throw new Error('ENCRYPTION_MASTER_KEY is required when ENCRYPTION_PROVIDER=local');
    }

    const buf = Buffer.from(wrapped, 'base64');
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(AES_ALGORITHM, this.masterKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  // ── AWS KMS provider (production) ──────────────────

  private async generateViaKMS(): Promise<{ plaintext: Buffer; encryptedDek: string }> {
    if (!this.kmsClient || !this.kmsKeyArn) {
      throw new Error('KMS client not initialised');
    }

    const command = new GenerateDataKeyCommand({
      KeyId: this.kmsKeyArn,
      KeySpec: 'AES_256',
    });

    const result = await this.kmsClient.send(command);

    if (!result.Plaintext || !result.CiphertextBlob) {
      throw new Error('KMS GenerateDataKey returned incomplete result');
    }

    return {
      plaintext: Buffer.from(result.Plaintext),
      encryptedDek: Buffer.from(result.CiphertextBlob).toString('base64'),
    };
  }

  private async unwrapViaKMS(encryptedDek: string): Promise<Buffer> {
    if (!this.kmsClient) {
      throw new Error('KMS client not initialised');
    }

    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedDek, 'base64'),
    });

    const result = await this.kmsClient.send(command);

    if (!result.Plaintext) {
      throw new Error('KMS Decrypt returned no plaintext');
    }

    return Buffer.from(result.Plaintext);
  }
}
