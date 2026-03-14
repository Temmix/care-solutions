import * as crypto from 'crypto';
import { BlindIndexService } from '../src/modules/encryption/blind-index.service';

const TEST_KEY = crypto.randomBytes(32);
const GLOBAL_KEY = crypto.randomBytes(32);

function createService() {
  const keyManager = {
    getDEK: jest.fn().mockResolvedValue({ keyId: 'key-1', key: TEST_KEY }),
    getGlobalBlindIndexKey: jest.fn().mockReturnValue(GLOBAL_KEY),
  };
  return { service: new BlindIndexService(keyManager as any), keyManager };
}

describe('BlindIndexService', () => {
  describe('computeBlindIndex', () => {
    it('produces a 64-char hex string', async () => {
      const { service } = createService();
      const hash = await service.computeBlindIndex('test@example.com', 'tenant-1', 'email');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces the same hash for the same input, tenant, and field', async () => {
      const { service } = createService();
      const hash1 = await service.computeBlindIndex('test@example.com', 'tenant-1', 'email');
      const hash2 = await service.computeBlindIndex('test@example.com', 'tenant-1', 'email');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different tenants', async () => {
      const keyA = crypto.randomBytes(32);
      const keyB = crypto.randomBytes(32);
      const keyManager = {
        getDEK: jest.fn((tenantId: string) => {
          if (tenantId === 'tenant-A') return Promise.resolve({ keyId: 'kA', key: keyA });
          return Promise.resolve({ keyId: 'kB', key: keyB });
        }),
      };
      const service = new BlindIndexService(keyManager as any);

      const hashA = await service.computeBlindIndex('same-value', 'tenant-A', 'email');
      const hashB = await service.computeBlindIndex('same-value', 'tenant-B', 'email');
      expect(hashA).not.toBe(hashB);
    });

    it('produces different hashes for different field names (HKDF isolation)', async () => {
      const { service } = createService();
      const hash1 = await service.computeBlindIndex('same-value', 'tenant-1', 'email');
      const hash2 = await service.computeBlindIndex('same-value', 'tenant-1', 'phone');
      expect(hash1).not.toBe(hash2);
    });

    it('normalizes case for consistent indexing', async () => {
      const { service } = createService();
      const hash1 = await service.computeBlindIndex('Test@Example.COM', 'tenant-1', 'email');
      const hash2 = await service.computeBlindIndex('test@example.com', 'tenant-1', 'email');
      expect(hash1).toBe(hash2);
    });

    it('strips diacritics for consistent indexing', async () => {
      const { service } = createService();
      const hash1 = await service.computeBlindIndex('Séan', 'tenant-1', 'givenName');
      const hash2 = await service.computeBlindIndex('Sean', 'tenant-1', 'givenName');
      expect(hash1).toBe(hash2);
    });

    it('strips apostrophes and hyphens', async () => {
      const { service } = createService();
      const hash1 = await service.computeBlindIndex("O'Brien", 'tenant-1', 'familyName');
      const hash2 = await service.computeBlindIndex('OBrien', 'tenant-1', 'familyName');
      expect(hash1).toBe(hash2);

      const hash3 = await service.computeBlindIndex('Smith-Jones', 'tenant-1', 'familyName');
      const hash4 = await service.computeBlindIndex('SmithJones', 'tenant-1', 'familyName');
      expect(hash3).toBe(hash4);
    });
  });

  describe('computeNgramIndexes', () => {
    it('generates correct n-grams for "John" with minLength=3', async () => {
      const { service } = createService();
      const hashes = await service.computeNgramIndexes('John', 'tenant-1', 'givenName', 3);

      // "john" → ngrams: "joh", "ohn", "john" = 3 unique n-grams
      expect(hashes).toHaveLength(3);
      // All should be unique hex strings
      const unique = new Set(hashes);
      expect(unique.size).toBe(3);
      hashes.forEach((h) => expect(h).toMatch(/^[a-f0-9]{64}$/));
    });

    it('generates correct n-grams for "Margaret" with minLength=3', async () => {
      const { service } = createService();
      const hashes = await service.computeNgramIndexes('Margaret', 'tenant-1', 'givenName', 3);

      // "margaret" (8 chars):
      // len 3: mar, arg, rga, gar, are, ret = 6
      // len 4: marg, arga, rgar, gare, aret = 5
      // len 5: marga, argar, rgare, garet = 4
      // len 6: margar, argare, rgaret = 3
      // len 7: margare, argaret = 2
      // len 8: margaret = 1
      // Total: 6+5+4+3+2+1 = 21
      expect(hashes.length).toBe(21);
    });

    it('returns a single hash when value is shorter than minLength', async () => {
      const { service } = createService();
      const hashes = await service.computeNgramIndexes('Jo', 'tenant-1', 'givenName', 3);
      expect(hashes).toHaveLength(1);
    });

    it('normalizes before generating n-grams', async () => {
      const { service } = createService();
      const hashes1 = await service.computeNgramIndexes('JOHN', 'tenant-1', 'givenName', 3);
      const hashes2 = await service.computeNgramIndexes('john', 'tenant-1', 'givenName', 3);
      expect(hashes1).toEqual(hashes2);
    });
  });

  describe('computeGlobalBlindIndex', () => {
    it('produces a 64-char hex string', () => {
      const { service } = createService();
      const hash = service.computeGlobalBlindIndex('test@example.com', 'email');
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces the same hash for the same input regardless of tenant', () => {
      const { service } = createService();
      const hash1 = service.computeGlobalBlindIndex('test@example.com', 'email');
      const hash2 = service.computeGlobalBlindIndex('test@example.com', 'email');
      expect(hash1).toBe(hash2);
    });

    it('produces different hashes for different field names', () => {
      const { service } = createService();
      const hash1 = service.computeGlobalBlindIndex('same-value', 'email');
      const hash2 = service.computeGlobalBlindIndex('same-value', 'phone');
      expect(hash1).not.toBe(hash2);
    });

    it('normalizes input', () => {
      const { service } = createService();
      const hash1 = service.computeGlobalBlindIndex('Test@Example.COM', 'email');
      const hash2 = service.computeGlobalBlindIndex('test@example.com', 'email');
      expect(hash1).toBe(hash2);
    });

    it('does not use tenant DEK', () => {
      const { service, keyManager } = createService();
      service.computeGlobalBlindIndex('test@example.com', 'email');
      expect(keyManager.getDEK).not.toHaveBeenCalled();
      expect(keyManager.getGlobalBlindIndexKey).toHaveBeenCalled();
    });
  });

  describe('computeSearchHash', () => {
    it('produces the same hash as a matching n-gram', async () => {
      const { service } = createService();
      // Index "John" → produces n-gram "joh"
      const indexHashes = await service.computeNgramIndexes('John', 'tenant-1', 'givenName', 3);
      // Search for "joh" → should match one of the index hashes
      const searchHash = await service.computeSearchHash('joh', 'tenant-1', 'givenName');
      expect(indexHashes).toContain(searchHash);
    });

    it('search for "ohn" matches index of "John"', async () => {
      const { service } = createService();
      const indexHashes = await service.computeNgramIndexes('John', 'tenant-1', 'givenName', 3);
      const searchHash = await service.computeSearchHash('ohn', 'tenant-1', 'givenName');
      expect(indexHashes).toContain(searchHash);
    });

    it('search for "xyz" does not match index of "John"', async () => {
      const { service } = createService();
      const indexHashes = await service.computeNgramIndexes('John', 'tenant-1', 'givenName', 3);
      const searchHash = await service.computeSearchHash('xyz', 'tenant-1', 'givenName');
      expect(indexHashes).not.toContain(searchHash);
    });
  });
});
