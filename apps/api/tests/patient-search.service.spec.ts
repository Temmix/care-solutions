import { PatientSearchService } from '../src/modules/encryption/patient-search.service';

function createService() {
  const prisma = {
    patientSearchIndex: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    patient: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const blindIndex = {
    computeBlindIndex: jest.fn(
      async (value: string, _t: string, field: string) => `bi:${field}:${value.toLowerCase()}`,
    ),
    computeNgramIndexes: jest.fn(async (value: string, _t: string, field: string) => {
      const normalized = value.toLowerCase();
      const ngrams: string[] = [];
      for (let len = 3; len <= normalized.length; len++) {
        for (let i = 0; i <= normalized.length - len; i++) {
          ngrams.push(`ng:${field}:${normalized.substring(i, i + len)}`);
        }
      }
      return ngrams.length > 0 ? ngrams : [`ng:${field}:${normalized}`];
    }),
    computeSearchHash: jest.fn(
      async (query: string, _t: string, field: string) => `ng:${field}:${query.toLowerCase()}`,
    ),
  };

  const service = new PatientSearchService(blindIndex as any, prisma as any);
  return { service, prisma, blindIndex };
}

describe('PatientSearchService', () => {
  describe('indexPatient', () => {
    it('creates n-gram indexes for given fields', async () => {
      const { service, prisma, blindIndex } = createService();

      await service.indexPatient('p-1', 'tenant-1', {
        givenName: 'John',
        familyName: 'Smith',
      });

      expect(blindIndex.computeNgramIndexes).toHaveBeenCalledWith(
        'John',
        'tenant-1',
        'givenName',
        3,
      );
      expect(blindIndex.computeNgramIndexes).toHaveBeenCalledWith(
        'Smith',
        'tenant-1',
        'familyName',
        3,
      );

      // Should delete old indexes first
      expect(prisma.patientSearchIndex.deleteMany).toHaveBeenCalledTimes(2);
      expect(prisma.patientSearchIndex.deleteMany).toHaveBeenCalledWith({
        where: { patientId: 'p-1', fieldName: 'givenName' },
      });

      // Should create new indexes
      expect(prisma.patientSearchIndex.createMany).toHaveBeenCalledTimes(2);
    });

    it('skips undefined field values', async () => {
      const { service, prisma, blindIndex } = createService();

      await service.indexPatient('p-1', 'tenant-1', {
        givenName: 'John',
        familyName: undefined,
      });

      expect(blindIndex.computeNgramIndexes).toHaveBeenCalledTimes(1);
      expect(prisma.patientSearchIndex.createMany).toHaveBeenCalledTimes(1);
    });

    it('includes correct data in createMany', async () => {
      const { service, prisma } = createService();

      await service.indexPatient('p-1', 'tenant-1', {
        givenName: 'John',
      });

      const createCall = prisma.patientSearchIndex.createMany.mock.calls[0][0];
      expect(createCall.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            patientId: 'p-1',
            tenantId: 'tenant-1',
            fieldName: 'givenName',
          }),
        ]),
      );

      // Each entry should have a tokenHash
      createCall.data.forEach((entry: Record<string, unknown>) => {
        expect(entry.tokenHash).toBeDefined();
        expect(typeof entry.tokenHash).toBe('string');
      });
    });
  });

  describe('searchByName', () => {
    it('returns matching patient IDs', async () => {
      const { service, prisma, blindIndex } = createService();

      prisma.patientSearchIndex.findMany.mockResolvedValue([
        { patientId: 'p-1' },
        { patientId: 'p-2' },
      ]);

      const result = await service.searchByName('joh', 'tenant-1');

      expect(blindIndex.computeSearchHash).toHaveBeenCalledWith('joh', 'tenant-1', 'givenName');
      expect(blindIndex.computeSearchHash).toHaveBeenCalledWith('joh', 'tenant-1', 'familyName');
      expect(result).toEqual(['p-1', 'p-2']);
    });

    it('deduplicates patient IDs', async () => {
      const { service, prisma } = createService();

      prisma.patientSearchIndex.findMany.mockResolvedValue([
        { patientId: 'p-1' },
        { patientId: 'p-1' }, // duplicate
        { patientId: 'p-2' },
      ]);

      const result = await service.searchByName('smi', 'tenant-1');

      expect(result).toEqual(['p-1', 'p-2']);
    });

    it('searches specified field names', async () => {
      const { service, prisma, blindIndex } = createService();

      prisma.patientSearchIndex.findMany.mockResolvedValue([]);

      await service.searchByName('test', 'tenant-1', ['givenName']);

      expect(blindIndex.computeSearchHash).toHaveBeenCalledTimes(1);
      expect(blindIndex.computeSearchHash).toHaveBeenCalledWith('test', 'tenant-1', 'givenName');

      expect(prisma.patientSearchIndex.findMany).toHaveBeenCalledWith({
        where: {
          tenantId: 'tenant-1',
          fieldName: { in: ['givenName'] },
          tokenHash: { in: expect.any(Array) },
        },
        select: { patientId: true },
      });
    });

    it('returns empty array when no matches', async () => {
      const { service, prisma } = createService();

      prisma.patientSearchIndex.findMany.mockResolvedValue([]);

      const result = await service.searchByName('xyz', 'tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('searchByPostalCode', () => {
    it('searches by exact blind index on Patient.postalCodeIndex', async () => {
      const { service, prisma, blindIndex } = createService();

      prisma.patient.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);

      const result = await service.searchByPostalCode('SW1A 1AA', 'tenant-1');

      expect(blindIndex.computeBlindIndex).toHaveBeenCalledWith(
        'SW1A 1AA',
        'tenant-1',
        'postalCode',
      );
      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', postalCodeIndex: 'bi:postalCode:sw1a 1aa' },
        select: { id: true },
      });
      expect(result).toEqual(['p-1', 'p-2']);
    });

    it('returns empty array when no matches', async () => {
      const { service, prisma } = createService();

      prisma.patient.findMany.mockResolvedValue([]);

      const result = await service.searchByPostalCode('XX1 1XX', 'tenant-1');

      expect(result).toEqual([]);
    });
  });
});
