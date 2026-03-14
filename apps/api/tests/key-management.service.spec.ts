import * as crypto from 'crypto';
import { KeyManagementService } from '../src/modules/encryption/key-management.service';

const MASTER_KEY = crypto.randomBytes(32).toString('hex');

function createService(overrides?: { provider?: string; masterKey?: string; cacheTtl?: string }) {
  const prisma = {
    encryptionKey: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const configValues: Record<string, string | undefined> = {
    ENCRYPTION_PROVIDER: overrides?.provider ?? 'local',
    ENCRYPTION_MASTER_KEY: 'masterKey' in (overrides ?? {}) ? overrides!.masterKey : MASTER_KEY,
    ENCRYPTION_DEK_CACHE_TTL_MS: overrides?.cacheTtl ?? '900000',
  };

  const configService = {
    get: jest.fn((key: string) => configValues[key]),
    getOrThrow: jest.fn((key: string) => {
      const val = configValues[key];
      if (!val) throw new Error(`Missing config: ${key}`);
      return val;
    }),
  };

  const service = new KeyManagementService(prisma as any, configService as any);

  return { service, prisma };
}

describe('KeyManagementService', () => {
  describe('generateDEK', () => {
    it('generates a DEK, wraps it with the local master key, and persists it', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.findFirst.mockResolvedValue(null); // no existing key
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-1',
        ...data,
      }));

      const result = await service.generateDEK('tenant-1');

      expect(result.keyId).toBe('ek-1');
      expect(result.key).toBeInstanceOf(Buffer);
      expect(result.key.length).toBe(32);

      expect(prisma.encryptionKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          keyVersion: 1,
          isActive: true,
          algorithm: 'AES-256-GCM',
        }),
      });
    });

    it('increments keyVersion when a previous key exists', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.findFirst.mockResolvedValueOnce({ keyVersion: 3 }); // generateDEK: latest version lookup

      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-new',
        ...data,
      }));

      const result = await service.generateDEK('tenant-1');

      expect(prisma.encryptionKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ keyVersion: 4 }),
      });
      expect(result.keyId).toBe('ek-new');
    });
  });

  describe('getDEK', () => {
    it('returns existing DEK from database and caches it', async () => {
      const { service, prisma } = createService();

      // Generate a real wrapped DEK for the mock to return
      const plainDek = crypto.randomBytes(32);
      const masterBuf = Buffer.from(MASTER_KEY, 'hex');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', masterBuf, iv, { authTagLength: 16 });
      const enc = Buffer.concat([cipher.update(plainDek), cipher.final()]);
      const tag = cipher.getAuthTag();
      const wrappedDek = Buffer.concat([iv, tag, enc]).toString('base64');

      prisma.encryptionKey.findFirst.mockResolvedValue({
        id: 'ek-1',
        tenantId: 'tenant-1',
        encryptedDek: wrappedDek,
        keyVersion: 1,
        isActive: true,
      });

      const result = await service.getDEK('tenant-1');

      expect(result.keyId).toBe('ek-1');
      expect(result.key).toEqual(plainDek);

      // Second call should use cache — no additional DB query
      const result2 = await service.getDEK('tenant-1');
      expect(result2.keyId).toBe('ek-1');
      expect(prisma.encryptionKey.findFirst).toHaveBeenCalledTimes(1);
    });

    it('generates a new DEK when no active key exists in database', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.findFirst.mockResolvedValue(null);
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-new',
        ...data,
      }));

      const result = await service.getDEK('tenant-1');

      expect(result.keyId).toBe('ek-new');
      expect(result.key.length).toBe(32);
      expect(prisma.encryptionKey.create).toHaveBeenCalled();
    });
  });

  describe('cache TTL', () => {
    it('re-fetches DEK after cache expires', async () => {
      const { service, prisma } = createService({ cacheTtl: '1' }); // 1ms TTL

      const plainDek = crypto.randomBytes(32);
      const masterBuf = Buffer.from(MASTER_KEY, 'hex');
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', masterBuf, iv, { authTagLength: 16 });
      const enc = Buffer.concat([cipher.update(plainDek), cipher.final()]);
      const tag = cipher.getAuthTag();
      const wrappedDek = Buffer.concat([iv, tag, enc]).toString('base64');

      prisma.encryptionKey.findFirst.mockResolvedValue({
        id: 'ek-1',
        tenantId: 'tenant-1',
        encryptedDek: wrappedDek,
        keyVersion: 1,
        isActive: true,
      });

      await service.getDEK('tenant-1');

      // Wait for cache to expire
      await new Promise((r) => setTimeout(r, 10));

      await service.getDEK('tenant-1');

      // Should have queried twice because cache expired
      expect(prisma.encryptionKey.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearCache', () => {
    it('clears cache for a specific tenant', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.findFirst.mockResolvedValue(null);
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-1',
        ...data,
      }));

      await service.getDEK('tenant-1');
      service.clearCache('tenant-1');

      // Reset mocks for the re-fetch
      prisma.encryptionKey.findFirst.mockResolvedValue(null);
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-2',
        ...data,
      }));

      const result = await service.getDEK('tenant-1');
      expect(result.keyId).toBe('ek-2');
    });
  });

  describe('rotateDEK', () => {
    it('deactivates old keys and generates a new one', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.updateMany.mockResolvedValue({ count: 1 });
      prisma.encryptionKey.findFirst.mockResolvedValue({ keyVersion: 2 });
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-rotated',
        ...data,
      }));

      const result = await service.rotateDEK('tenant-1');

      expect(prisma.encryptionKey.updateMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', isActive: true },
        data: expect.objectContaining({ isActive: false }),
      });

      expect(result.keyId).toBe('ek-rotated');
      expect(prisma.encryptionKey.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ keyVersion: 3 }),
      });
    });
  });

  describe('local wrap/unwrap roundtrip', () => {
    it('wrapping and unwrapping produces the original key material', async () => {
      const { service, prisma } = createService();

      prisma.encryptionKey.findFirst.mockResolvedValue(null);
      prisma.encryptionKey.create.mockImplementation(async ({ data }) => ({
        id: 'ek-rt',
        ...data,
      }));

      const generated = await service.generateDEK('tenant-1');

      // The create call includes the wrapped DEK — unwrap it to verify roundtrip
      const createData = prisma.encryptionKey.create.mock.calls[0][0].data;
      const wrappedDek = createData.encryptedDek;

      // Clear cache and set up findFirst to return the wrapped key
      service.clearCache();
      prisma.encryptionKey.findFirst.mockResolvedValue({
        id: 'ek-rt',
        encryptedDek: wrappedDek,
        keyVersion: 1,
        isActive: true,
      });

      const fetched = await service.getDEK('tenant-1');
      expect(fetched.key).toEqual(generated.key);
    });
  });

  describe('missing master key', () => {
    it('throws when ENCRYPTION_MASTER_KEY is not set for local provider', async () => {
      const { service, prisma } = createService({ masterKey: undefined });

      prisma.encryptionKey.findFirst.mockResolvedValue(null);

      await expect(service.generateDEK('tenant-1')).rejects.toThrow(
        'ENCRYPTION_MASTER_KEY is required',
      );
    });
  });

  describe('getGlobalBlindIndexKey', () => {
    it('returns a 32-byte Buffer derived from the master key', () => {
      const { service } = createService();
      const key = service.getGlobalBlindIndexKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('returns the same key on repeated calls', () => {
      const { service } = createService();
      const key1 = service.getGlobalBlindIndexKey();
      const key2 = service.getGlobalBlindIndexKey();
      expect(key1.equals(key2)).toBe(true);
    });

    it('throws when master key is not configured', () => {
      const { service } = createService({ masterKey: undefined });
      expect(() => service.getGlobalBlindIndexKey()).toThrow(
        'ENCRYPTION_MASTER_KEY is required for global blind indexes',
      );
    });
  });
});
