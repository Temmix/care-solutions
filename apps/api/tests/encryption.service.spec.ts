import * as crypto from 'crypto';
import { EncryptionService } from '../src/modules/encryption/encryption.service';
import { ENCRYPTION_PREFIX } from '../src/modules/encryption/encryption.constants';

const TEST_KEY = crypto.randomBytes(32);
const TEST_KEY_ID = 'key-001';

function createService(enabled = true) {
  const keyManager = {
    getDEK: jest.fn().mockResolvedValue({ keyId: TEST_KEY_ID, key: TEST_KEY }),
  };
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'ENCRYPTION_ENABLED') return enabled ? 'true' : 'false';
      return undefined;
    }),
  };
  return {
    service: new EncryptionService(keyManager as any, configService as any),
    keyManager,
  };
}

describe('EncryptionService', () => {
  describe('isEncrypted', () => {
    it('returns true for values with the encryption prefix', () => {
      const { service } = createService();
      expect(service.isEncrypted(`${ENCRYPTION_PREFIX}abc123`)).toBe(true);
    });

    it('returns false for plaintext values', () => {
      const { service } = createService();
      expect(service.isEncrypted('hello world')).toBe(false);
    });

    it('returns false for empty string', () => {
      const { service } = createService();
      expect(service.isEncrypted('')).toBe(false);
    });
  });

  describe('encrypt / decrypt roundtrip', () => {
    it('encrypts and decrypts a string value', async () => {
      const { service } = createService();
      const plaintext = 'Margaret Whitfield';
      const tenantId = 'tenant-1';

      const encrypted = await service.encrypt(plaintext, tenantId);
      expect(service.isEncrypted(encrypted)).toBe(true);
      expect(encrypted).not.toContain(plaintext);

      const decrypted = await service.decrypt(encrypted, tenantId);
      expect(decrypted).toBe(plaintext);
    });

    it('produces different ciphertext for the same plaintext (random IV)', async () => {
      const { service } = createService();
      const plaintext = 'Same value';
      const tenantId = 'tenant-1';

      const encrypted1 = await service.encrypt(plaintext, tenantId);
      const encrypted2 = await service.encrypt(plaintext, tenantId);

      expect(encrypted1).not.toBe(encrypted2);

      // Both decrypt to the same value
      expect(await service.decrypt(encrypted1, tenantId)).toBe(plaintext);
      expect(await service.decrypt(encrypted2, tenantId)).toBe(plaintext);
    });

    it('handles unicode and special characters', async () => {
      const { service } = createService();
      const plaintext = "Séan O'Brien — 日本語テスト";
      const tenantId = 'tenant-1';

      const encrypted = await service.encrypt(plaintext, tenantId);
      const decrypted = await service.decrypt(encrypted, tenantId);
      expect(decrypted).toBe(plaintext);
    });

    it('handles empty string', async () => {
      const { service } = createService();
      const encrypted = await service.encrypt('', 'tenant-1');
      const decrypted = await service.decrypt(encrypted, 'tenant-1');
      expect(decrypted).toBe('');
    });
  });

  describe('different tenants', () => {
    it('uses getDEK with the correct tenant ID', async () => {
      const { service, keyManager } = createService();

      await service.encrypt('test', 'tenant-A');
      expect(keyManager.getDEK).toHaveBeenCalledWith('tenant-A');

      await service.encrypt('test', 'tenant-B');
      expect(keyManager.getDEK).toHaveBeenCalledWith('tenant-B');
    });

    it('produces different ciphertext for different tenants with different keys', async () => {
      const keyA = crypto.randomBytes(32);
      const keyB = crypto.randomBytes(32);

      const keyManager = {
        getDEK: jest.fn((tenantId: string) => {
          if (tenantId === 'tenant-A') return Promise.resolve({ keyId: 'kA', key: keyA });
          return Promise.resolve({ keyId: 'kB', key: keyB });
        }),
      };
      const configService = {
        get: jest.fn(() => 'true'),
      };
      const service = new EncryptionService(keyManager as any, configService as any);

      const encA = await service.encrypt('same', 'tenant-A');
      const encB = await service.encrypt('same', 'tenant-B');

      // Ciphertext differs because keys differ
      expect(encA).not.toBe(encB);
    });
  });

  describe('feature flag', () => {
    it('returns plaintext when encryption is disabled', async () => {
      const { service } = createService(false);

      const result = await service.encrypt('hello', 'tenant-1');
      expect(result).toBe('hello');
      expect(service.isEncrypted(result)).toBe(false);
    });

    it('decrypts plaintext as-is when value is not encrypted', async () => {
      const { service } = createService(true);

      const result = await service.decrypt('plain value', 'tenant-1');
      expect(result).toBe('plain value');
    });
  });

  describe('encryptJson / decryptJson', () => {
    it('encrypts and decrypts a JSON object', async () => {
      const { service } = createService();
      const value = { question: 'How are you?', answer: 42, nested: [1, 2, 3] };

      const encrypted = await service.encryptJson(value, 'tenant-1');
      expect(service.isEncrypted(encrypted)).toBe(true);

      const decrypted = await service.decryptJson(encrypted, 'tenant-1');
      expect(decrypted).toEqual(value);
    });

    it('handles null and primitive JSON values', async () => {
      const { service } = createService();

      const encNull = await service.encryptJson(null, 'tenant-1');
      expect(await service.decryptJson(encNull, 'tenant-1')).toBeNull();

      const encNum = await service.encryptJson(123, 'tenant-1');
      expect(await service.decryptJson(encNum, 'tenant-1')).toBe(123);
    });
  });

  describe('isEnabled', () => {
    it('returns true when ENCRYPTION_ENABLED is true', () => {
      const { service } = createService(true);
      expect(service.isEnabled()).toBe(true);
    });

    it('returns false when ENCRYPTION_ENABLED is false', () => {
      const { service } = createService(false);
      expect(service.isEnabled()).toBe(false);
    });
  });
});
