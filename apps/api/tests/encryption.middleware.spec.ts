import { setupEncryptionMiddleware } from '../src/prisma/encryption.middleware';
import { ENCRYPTION_PREFIX } from '../src/modules/encryption/encryption.constants';

// ── Mock factories ───────────────────────────────────────

function createMockEncryptionService(enabled = true) {
  return {
    isEnabled: jest.fn(() => enabled),
    isEncrypted: jest.fn((v: string) => typeof v === 'string' && v.startsWith(ENCRYPTION_PREFIX)),
    encrypt: jest.fn(
      async (plaintext: string) =>
        `${ENCRYPTION_PREFIX}${Buffer.from(plaintext).toString('base64')}`,
    ),
    decrypt: jest.fn(async (ciphertext: string) => {
      const b64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
      return Buffer.from(b64, 'base64').toString('utf8');
    }),
    encryptJson: jest.fn(
      async (value: unknown) =>
        `${ENCRYPTION_PREFIX}${Buffer.from(JSON.stringify(value)).toString('base64')}`,
    ),
    decryptJson: jest.fn(async (ciphertext: string) => {
      const b64 = ciphertext.slice(ENCRYPTION_PREFIX.length);
      return JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    }),
  };
}

function createMockBlindIndexService() {
  return {
    computeBlindIndex: jest.fn(
      async (value: string, _tenantId: string, fieldName: string) =>
        `bi:${fieldName}:${value.toLowerCase()}`,
    ),
    computeNgramIndexes: jest.fn(async (value: string, _tenantId: string, fieldName: string) => {
      const normalized = value.toLowerCase();
      const ngrams: string[] = [];
      for (let len = 3; len <= normalized.length; len++) {
        for (let i = 0; i <= normalized.length - len; i++) {
          ngrams.push(`ng:${fieldName}:${normalized.substring(i, i + len)}`);
        }
      }
      return ngrams.length > 0 ? ngrams : [`ng:${fieldName}:${normalized}`];
    }),
    computeSearchHash: jest.fn(
      async (query: string, _tenantId: string, fieldName: string) =>
        `ng:${fieldName}:${query.toLowerCase()}`,
    ),
  };
}

interface MiddlewareCall {
  params: {
    model?: string;
    action: string;
    args: Record<string, unknown>;
    dataPath: string[];
    runInTransaction: boolean;
  };
  next: jest.Mock;
}

function createMockPrisma() {
  const middlewares: Function[] = [];

  const patientSearchIndex = {
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    createMany: jest.fn().mockResolvedValue({ count: 0 }),
    findMany: jest.fn().mockResolvedValue([]),
  };

  const patient = {
    findUnique: jest.fn().mockResolvedValue(null),
    findFirst: jest.fn().mockResolvedValue(null),
  };

  const carePlan = {
    findUnique: jest.fn().mockResolvedValue(null),
  };

  const organization = {
    findUnique: jest.fn().mockResolvedValue(null),
  };

  const prisma = {
    $use: jest.fn((fn: Function) => middlewares.push(fn)),
    patientSearchIndex,
    patient,
    carePlan,
    organization,
  };

  async function simulateQuery(call: MiddlewareCall): Promise<unknown> {
    if (middlewares.length === 0) throw new Error('No middleware registered');
    return middlewares[0](call.params, call.next);
  }

  return { prisma, simulateQuery, patientSearchIndex };
}

// ── Tests ────────────────────────────────────────────────

describe('Encryption Middleware', () => {
  describe('setup', () => {
    it('registers a middleware via $use', () => {
      const { prisma } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();

      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      expect(prisma.$use).toHaveBeenCalledTimes(1);
    });
  });

  describe('feature flag', () => {
    it('passes through when encryption is disabled', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService(false);
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const data = { givenName: 'John', tenantId: 'tenant-1' };
      const next = jest.fn().mockResolvedValue({ id: '1', ...data });

      const result = await simulateQuery({
        params: {
          model: 'Patient',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(data.givenName).toBe('John'); // not encrypted
      expect(result).toEqual({ id: '1', ...data });
    });
  });

  describe('unregistered model', () => {
    it('passes through for models not in ENCRYPTED_FIELDS', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const data = { name: 'Test Location' };
      const next = jest.fn().mockResolvedValue({ id: '1', ...data });

      const result = await simulateQuery({
        params: {
          model: 'Location',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(data.name).toBe('Test Location');
      expect(result).toEqual({ id: '1', ...data });
    });
  });

  describe('create — encryption on write', () => {
    it('encrypts configured fields on Patient create', async () => {
      const { prisma, simulateQuery, patientSearchIndex } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const data = {
        givenName: 'John',
        familyName: 'Smith',
        phone: '07700900000',
        tenantId: 'tenant-1',
      };

      const next = jest.fn().mockResolvedValue({
        id: 'patient-1',
        tenantId: 'tenant-1',
        givenName: data.givenName, // will be encrypted value after mutation
        familyName: data.familyName,
        phone: data.phone,
      });

      await simulateQuery({
        params: {
          model: 'Patient',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      // Verify encrypt was called for each field
      expect(enc.encrypt).toHaveBeenCalledWith('John', 'tenant-1');
      expect(enc.encrypt).toHaveBeenCalledWith('Smith', 'tenant-1');
      expect(enc.encrypt).toHaveBeenCalledWith('07700900000', 'tenant-1');

      // Data should be mutated in place with encrypted values
      expect(data.givenName).toMatch(new RegExp(`^${ENCRYPTION_PREFIX}`));
      expect(data.familyName).toMatch(new RegExp(`^${ENCRYPTION_PREFIX}`));
    });

    it('computes exact blind index for postalCode', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const data: Record<string, unknown> = {
        givenName: 'John',
        postalCode: 'SW1A 1AA',
        tenantId: 'tenant-1',
      };

      const next = jest.fn().mockResolvedValue({
        id: 'p-1',
        tenantId: 'tenant-1',
        postalCode: data.postalCode,
        postalCodeIndex: data.postalCodeIndex,
      });

      await simulateQuery({
        params: {
          model: 'Patient',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(bi.computeBlindIndex).toHaveBeenCalledWith('SW1A 1AA', 'tenant-1', 'postalCode');
      expect(data.postalCodeIndex).toBe('bi:postalCode:sw1a 1aa');
    });

    it('creates n-gram search indexes for Patient name fields', async () => {
      const { prisma, simulateQuery, patientSearchIndex } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const data = {
        givenName: 'John',
        familyName: 'Smith',
        tenantId: 'tenant-1',
      };

      const next = jest.fn().mockResolvedValue({
        id: 'patient-1',
        tenantId: 'tenant-1',
        givenName: `${ENCRYPTION_PREFIX}xxx`,
        familyName: `${ENCRYPTION_PREFIX}yyy`,
      });

      await simulateQuery({
        params: {
          model: 'Patient',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      // N-gram indexes should be created for givenName and familyName
      expect(bi.computeNgramIndexes).toHaveBeenCalledWith('John', 'tenant-1', 'givenName');
      expect(bi.computeNgramIndexes).toHaveBeenCalledWith('Smith', 'tenant-1', 'familyName');
      expect(patientSearchIndex.deleteMany).toHaveBeenCalledTimes(2);
      expect(patientSearchIndex.createMany).toHaveBeenCalledTimes(2);
    });
  });

  describe('read — decryption', () => {
    it('decrypts fields on findMany result', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const encryptedName = `${ENCRYPTION_PREFIX}${Buffer.from('Margaret').toString('base64')}`;

      const next = jest.fn().mockResolvedValue([
        {
          id: 'p-1',
          tenantId: 'tenant-1',
          givenName: encryptedName,
          familyName: 'PlainSmith', // not encrypted — rollout fallback
        },
      ]);

      const result = (await simulateQuery({
        params: {
          model: 'Patient',
          action: 'findMany',
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        next,
      })) as Record<string, unknown>[];

      expect(result[0].givenName).toBe('Margaret');
      expect(result[0].familyName).toBe('PlainSmith'); // unchanged — not encrypted
    });

    it('decrypts fields on findUnique result', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const encryptedEmail = `${ENCRYPTION_PREFIX}${Buffer.from('test@example.com').toString('base64')}`;

      const next = jest.fn().mockResolvedValue({
        id: 'u-1',
        tenantId: 'tenant-1',
        email: encryptedEmail,
        firstName: null, // null values should be skipped
      });

      const result = (await simulateQuery({
        params: {
          model: 'User',
          action: 'findUnique',
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        next,
      })) as Record<string, unknown>;

      expect(result.email).toBe('test@example.com');
      expect(result.firstName).toBeNull();
    });

    it('returns null result as-is', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const next = jest.fn().mockResolvedValue(null);

      const result = await simulateQuery({
        params: {
          model: 'Patient',
          action: 'findUnique',
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(result).toBeNull();
    });
  });

  describe('nested relation decryption', () => {
    it('decrypts included PatientContact fields', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const encContactName = `${ENCRYPTION_PREFIX}${Buffer.from('Jane').toString('base64')}`;

      // Mock parent lookup for PatientContact tenant resolution
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });

      const next = jest.fn().mockResolvedValue({
        id: 'p-1',
        tenantId: 'tenant-1',
        givenName: 'PlainJohn', // not encrypted
        contacts: [
          {
            id: 'c-1',
            patientId: 'p-1',
            givenName: encContactName,
          },
        ],
      });

      const result = (await simulateQuery({
        params: {
          model: 'Patient',
          action: 'findFirst',
          args: {},
          dataPath: [],
          runInTransaction: false,
        },
        next,
      })) as Record<string, unknown>;

      const contacts = result.contacts as Record<string, unknown>[];
      expect(contacts[0].givenName).toBe('Jane');
    });
  });

  describe('update operations', () => {
    it('encrypts fields on update with tenantId in where', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      // Mock finding existing record for tenant resolution
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });

      const data: Record<string, unknown> = { givenName: 'Updated' };
      const where = { id: 'p-1' };

      const next = jest.fn().mockResolvedValue({
        id: 'p-1',
        tenantId: 'tenant-1',
        givenName: `${ENCRYPTION_PREFIX}xxx`,
      });

      await simulateQuery({
        params: {
          model: 'Patient',
          action: 'update',
          args: { data, where },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(enc.encrypt).toHaveBeenCalledWith('Updated', 'tenant-1');
    });
  });

  describe('child model tenant resolution', () => {
    it('resolves tenantId from parent for PatientIdentifier create', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      // Mock parent lookup
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });

      const data: Record<string, unknown> = {
        value: 'NHS1234567',
        type: 'NHS',
        patientId: 'p-1',
      };

      const next = jest.fn().mockResolvedValue({
        id: 'pi-1',
        patientId: 'p-1',
        value: `${ENCRYPTION_PREFIX}xxx`,
        valueIndex: 'bi:value:nhs1234567',
      });

      await simulateQuery({
        params: {
          model: 'PatientIdentifier',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      expect(prisma.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        select: { tenantId: true },
      });
      expect(enc.encrypt).toHaveBeenCalledWith('NHS1234567', 'tenant-1');
      expect(bi.computeBlindIndex).toHaveBeenCalledWith('NHS1234567', 'tenant-1', 'value');
      expect(data.valueIndex).toBe('bi:value:nhs1234567');
    });
  });

  describe('JSON field encryption', () => {
    it('encrypts and decrypts Json fields (Assessment.responses)', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const responses = { q1: 'yes', q2: 'no' };
      const data = {
        notes: 'Some notes',
        responses,
        tenantId: 'tenant-1',
      };

      const encryptedResponses = `${ENCRYPTION_PREFIX}${Buffer.from(JSON.stringify(responses)).toString('base64')}`;

      const next = jest.fn().mockResolvedValue({
        id: 'a-1',
        tenantId: 'tenant-1',
        notes: `${ENCRYPTION_PREFIX}${Buffer.from('Some notes').toString('base64')}`,
        responses: encryptedResponses,
      });

      const result = (await simulateQuery({
        params: {
          model: 'Assessment',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      })) as Record<string, unknown>;

      expect(enc.encryptJson).toHaveBeenCalledWith(responses, 'tenant-1');
      expect(enc.encrypt).toHaveBeenCalledWith('Some notes', 'tenant-1');

      // Result should be decrypted
      expect(result.notes).toBe('Some notes');
      expect(result.responses).toEqual(responses);
    });
  });

  describe('skip already-encrypted values', () => {
    it('does not double-encrypt values that are already encrypted', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      const alreadyEncrypted = `${ENCRYPTION_PREFIX}already-encrypted`;
      const data = {
        givenName: alreadyEncrypted,
        tenantId: 'tenant-1',
      };

      const next = jest.fn().mockResolvedValue({
        id: 'p-1',
        tenantId: 'tenant-1',
        givenName: alreadyEncrypted,
      });

      await simulateQuery({
        params: {
          model: 'Patient',
          action: 'create',
          args: { data },
          dataPath: [],
          runInTransaction: false,
        },
        next,
      });

      // encrypt should NOT be called for the already-encrypted field
      expect(enc.encrypt).not.toHaveBeenCalledWith(alreadyEncrypted, expect.anything());
    });
  });

  describe('upsert', () => {
    it('encrypts both create and update data', async () => {
      const { prisma, simulateQuery } = createMockPrisma();
      const enc = createMockEncryptionService();
      const bi = createMockBlindIndexService();
      setupEncryptionMiddleware(prisma as any, enc as any, bi as any);

      (prisma.patient.findFirst as jest.Mock).mockResolvedValue({ tenantId: 'tenant-1' });

      const args = {
        where: { id: 'p-1' },
        create: { givenName: 'NewJohn', tenantId: 'tenant-1' },
        update: { givenName: 'UpdatedJohn' },
      };

      const next = jest.fn().mockResolvedValue({
        id: 'p-1',
        tenantId: 'tenant-1',
        givenName: `${ENCRYPTION_PREFIX}xxx`,
      });

      await simulateQuery({
        params: { model: 'Patient', action: 'upsert', args, dataPath: [], runInTransaction: false },
        next,
      });

      expect(enc.encrypt).toHaveBeenCalledWith('NewJohn', 'tenant-1');
      expect(enc.encrypt).toHaveBeenCalledWith('UpdatedJohn', 'tenant-1');
    });
  });
});
