import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PatientsService } from '../src/modules/epr/patients/patients.service';

jest.mock('../src/modules/epr/patients/mappers/patient-fhir.mapper', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toFhirPatient: jest.fn((p: any) => ({ id: p.id, resourceType: 'Patient' })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toFhirPatientBundle: jest.fn((patients: any[], total: number) => ({
    total,
    entry: patients.map((p: any) => ({ resource: { id: p.id } })),
  })),
}));

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: {
    patient: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    patientEvent: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      patient: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      patientEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb: (tx: any) => Promise<unknown>) => cb(prisma)),
    };

    const limits = {
      enforcePatientLimit: jest.fn(),
      enforceUserLimit: jest.fn(),
    };
    const encryption = { isEnabled: jest.fn().mockReturnValue(false) };
    const blindIndex = {
      computeBlindIndex: jest.fn(async (_v: string, _t: string, f: string) => `bi:${f}`),
      computeGlobalBlindIndex: jest.fn(),
    };
    const patientSearch = {
      searchByName: jest.fn().mockResolvedValue([]),
      searchByPostalCode: jest.fn().mockResolvedValue([]),
    };
    service = new PatientsService(
      prisma as any,
      limits as any,
      encryption as any,
      blindIndex as any,
      patientSearch as any,
    );
  });

  describe('search', () => {
    it('should return paginated FHIR bundle with default pagination', async () => {
      const mockPatients = [{ id: 'p1' }, { id: 'p2' }];
      prisma.patient.findMany.mockResolvedValue(mockPatients);
      prisma.patient.count.mockResolvedValue(2);

      const result = await service.search({} as any, 'tenant-1');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { active: true, tenantId: 'tenant-1' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({
        total: 2,
        entry: [{ resource: { id: 'p1' } }, { resource: { id: 'p2' } }],
      });
    });

    it('should apply name filter with OR condition', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.search({ name: 'John' } as any, 'tenant-1');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { givenName: { contains: 'John', mode: 'insensitive' } },
              { familyName: { contains: 'John', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should apply nhsNumber filter', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.search({ nhsNumber: '1234567890' } as any, 'tenant-1');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            identifiers: { some: { type: 'NHS_NUMBER', value: '1234567890' } },
          }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.search({ page: '3', limit: '10' } as any, 'tenant-1');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('should not scope by tenantId when tenantId is null (SUPER_ADMIN)', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await service.search({} as any, null);

      const callArgs = prisma.patient.findMany.mock.calls[0][0];
      expect(callArgs.where.tenantId).toBeUndefined();
    });
  });

  describe('search (encrypted)', () => {
    let encryptedService: PatientsService;
    let mockEncryption: { isEnabled: jest.Mock };
    let mockBlindIndex: { computeBlindIndex: jest.Mock };
    let mockPatientSearch: { searchByName: jest.Mock; searchByPostalCode: jest.Mock };

    beforeEach(() => {
      mockEncryption = { isEnabled: jest.fn().mockReturnValue(true) };
      mockBlindIndex = {
        computeBlindIndex: jest.fn(
          async (value: string, _t: string, field: string) => `bi:${field}:${value}`,
        ),
      };
      mockPatientSearch = {
        searchByName: jest.fn().mockResolvedValue(['p-1', 'p-2']),
        searchByPostalCode: jest.fn().mockResolvedValue(['p-1']),
      };
      encryptedService = new PatientsService(
        prisma as any,
        { enforcePatientLimit: jest.fn() } as any,
        mockEncryption as any,
        mockBlindIndex as any,
        mockPatientSearch as any,
      );
    });

    it('should use PatientSearchService for name search when encrypted', async () => {
      prisma.patient.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }]);
      prisma.patient.count.mockResolvedValue(2);

      await encryptedService.search({ name: 'John' } as any, 'tenant-1');

      expect(mockPatientSearch.searchByName).toHaveBeenCalledWith('John', 'tenant-1');
      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { in: ['p-1', 'p-2'] },
          }),
        }),
      );
    });

    it('should use blind index for NHS number search when encrypted', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await encryptedService.search({ nhsNumber: '1234567890' } as any, 'tenant-1');

      expect(mockBlindIndex.computeBlindIndex).toHaveBeenCalledWith(
        '1234567890',
        'tenant-1',
        'value',
      );
      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            identifiers: { some: { type: 'NHS_NUMBER', valueIndex: 'bi:value:1234567890' } },
          }),
        }),
      );
    });

    it('should use PatientSearchService for postal code search when encrypted', async () => {
      prisma.patient.findMany.mockResolvedValue([{ id: 'p-1' }]);
      prisma.patient.count.mockResolvedValue(1);

      await encryptedService.search({ postalCode: 'SW1A' } as any, 'tenant-1');

      expect(mockPatientSearch.searchByPostalCode).toHaveBeenCalledWith('SW1A', 'tenant-1');
    });

    it('should return empty bundle when name search yields no matches', async () => {
      mockPatientSearch.searchByName.mockResolvedValue([]);

      const result = await encryptedService.search({ name: 'xyz' } as any, 'tenant-1');

      expect(result).toEqual({ total: 0, entry: [] });
      expect(prisma.patient.findMany).not.toHaveBeenCalled();
    });

    it('should order by createdAt when encrypted', async () => {
      prisma.patient.findMany.mockResolvedValue([]);
      prisma.patient.count.mockResolvedValue(0);

      await encryptedService.search({} as any, 'tenant-1');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return FHIR patient when found', async () => {
      const mockPatient = { id: 'p1', userId: 'u1' };
      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      const result = await service.findOne('p1', 'tenant-1');

      expect(result).toEqual({ id: 'p1', resourceType: 'Patient' });
      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', tenantId: 'tenant-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when patient not found', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.findOne('p1', 'tenant-1')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('p1', 'tenant-1')).rejects.toThrow('Patient not found');
    });

    it('should throw ForbiddenException when PATIENT views another patients record', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'p1', userId: 'other-user' });

      await expect(service.findOne('p1', 'tenant-1', 'my-user', 'PATIENT')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow PATIENT to view own record', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'p1', userId: 'my-user' });

      const result = await service.findOne('p1', 'tenant-1', 'my-user', 'PATIENT');

      expect(result).toEqual({ id: 'p1', resourceType: 'Patient' });
    });

    it('should not scope by tenantId when tenantId is null', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'p1', userId: 'u1' });

      await service.findOne('p1', null);

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1' },
        include: expect.any(Object),
      });
    });
  });

  describe('create', () => {
    it('should create patient with event and audit log in transaction', async () => {
      const mockCreated = { id: 'p1', givenName: 'John', familyName: 'Doe' };
      prisma.patient.create.mockResolvedValue(mockCreated);
      prisma.patientEvent.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const dto = {
        givenName: 'John',
        familyName: 'Doe',
        birthDate: '1990-01-01',
        gender: 'MALE',
      };

      const result = await service.create(dto as any, 'user-1', 'tenant-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.patient.create).toHaveBeenCalled();
      expect(prisma.patientEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'p1',
          eventType: 'CREATED',
          recordedById: 'user-1',
          tenantId: 'tenant-1',
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'CREATE',
          resource: 'Patient',
          resourceId: 'p1',
          tenantId: 'tenant-1',
        }),
      });
      expect(result).toEqual({ id: 'p1', resourceType: 'Patient' });
    });
  });

  describe('deactivate', () => {
    it('should deactivate patient with event and audit log', async () => {
      prisma.patient.findFirst.mockResolvedValue({ id: 'p1' });
      prisma.patient.update.mockResolvedValue({});
      prisma.patientEvent.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await service.deactivate('p1', 'user-1', 'tenant-1');

      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { active: false, status: 'INACTIVE' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DEACTIVATE',
        }),
      });
    });

    it('should throw NotFoundException when patient not found for deactivation', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(service.deactivate('p1', 'user-1', 'tenant-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
