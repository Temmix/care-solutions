import { AuditService } from '../src/modules/audit/audit.service';

const TENANT = 'tenant-1';

type Row = {
  id: string;
  userId?: string;
  action?: string;
  resource: string;
  resourceId: string | null;
  metadata?: unknown;
  createdAt?: Date;
  tenantId?: string;
  user?: { firstName: string; lastName: string; email: string };
};

const row = (overrides: Partial<Row> & Pick<Row, 'resource' | 'resourceId'>): Row => ({
  id: `log-${overrides.resourceId ?? 'x'}`,
  userId: 'u-1',
  action: 'VIEW',
  user: { firstName: 'Sarah', lastName: 'Smith', email: 's@x.test' },
  ...overrides,
});

const buildPrisma = (rows: Row[]) => ({
  auditLog: {
    findMany: jest.fn().mockResolvedValue(rows),
    count: jest.fn().mockResolvedValue(rows.length),
  },
  patient: { findMany: jest.fn().mockResolvedValue([]) },
  user: { findMany: jest.fn().mockResolvedValue([]) },
  carePlan: { findMany: jest.fn().mockResolvedValue([]) },
  assessment: { findMany: jest.fn().mockResolvedValue([]) },
  medicationRequest: { findMany: jest.fn().mockResolvedValue([]) },
  encounter: { findMany: jest.fn().mockResolvedValue([]) },
  chcCase: { findMany: jest.fn().mockResolvedValue([]) },
  virtualWardEnrolment: { findMany: jest.fn().mockResolvedValue([]) },
});

const build = (prisma: ReturnType<typeof buildPrisma>) => new AuditService(prisma as never);

describe('AuditService.search — target enrichment', () => {
  it('resolves a direct Patient view to the patient name + id', async () => {
    const prisma = buildPrisma([row({ resource: 'Patient', resourceId: 'pat-1' })]);
    prisma.patient.findMany.mockResolvedValue([
      { id: 'pat-1', givenName: 'Jane', middleName: null, familyName: 'Doe' },
    ]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0]).toMatchObject({ patientId: 'pat-1', patientName: 'Jane Doe' });
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['pat-1'] }, tenantId: TENANT } }),
    );
  });

  it('resolves a patient-linked resource (CarePlan) via record → patientId → name', async () => {
    const prisma = buildPrisma([row({ resource: 'CarePlan', resourceId: 'cp-1' })]);
    prisma.carePlan.findMany.mockResolvedValue([{ id: 'cp-1', patientId: 'pat-2' }]);
    prisma.patient.findMany.mockResolvedValue([
      { id: 'pat-2', givenName: 'John', middleName: 'Q', familyName: 'Smith' },
    ]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0]).toMatchObject({ patientId: 'pat-2', patientName: 'John Q Smith' });
    expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['cp-1'] }, tenantId: TENANT } }),
    );
  });

  it('surfaces an anonymised patient as "(erased patient)", not the raw tombstone', async () => {
    const prisma = buildPrisma([row({ resource: 'Patient', resourceId: 'pat-3' })]);
    prisma.patient.findMany.mockResolvedValue([
      { id: 'pat-3', givenName: '[ERASED]', middleName: null, familyName: '[ERASED]' },
    ]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0].patientName).toBe('(erased patient)');
  });

  it('leaves patientName undefined when the patient record was hard-deleted', async () => {
    const prisma = buildPrisma([row({ resource: 'Patient', resourceId: 'pat-9' })]);
    prisma.patient.findMany.mockResolvedValue([]); // purged

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0].patientId).toBe('pat-9');
    expect(data[0].patientName).toBeUndefined();
  });

  it('batches patient lookups across rows (no N+1)', async () => {
    const prisma = buildPrisma([
      row({ id: 'l1', resource: 'Patient', resourceId: 'pat-1' }),
      row({ id: 'l2', resource: 'Patient', resourceId: 'pat-1' }),
      row({ id: 'l3', resource: 'CarePlan', resourceId: 'cp-1' }),
    ]);
    prisma.carePlan.findMany.mockResolvedValue([{ id: 'cp-1', patientId: 'pat-2' }]);
    prisma.patient.findMany.mockResolvedValue([
      { id: 'pat-1', givenName: 'Jane', middleName: null, familyName: 'Doe' },
      { id: 'pat-2', givenName: 'John', middleName: null, familyName: 'Smith' },
    ]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(prisma.patient.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.patient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['pat-1', 'pat-2'] }, tenantId: TENANT } }),
    );
    expect(data.map((d) => d.patientName)).toEqual(['Jane Doe', 'Jane Doe', 'John Smith']);
  });

  it('resolves a User-resource target to a display name', async () => {
    const prisma = buildPrisma([row({ resource: 'User', resourceId: 'u-9', action: 'UPDATE' })]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u-9', firstName: 'Admin', lastName: 'User' }]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0].resourceName).toBe('Admin User');
    expect(data[0].patientName).toBeUndefined();
  });

  it('returns rows unchanged for unresolvable resources', async () => {
    const prisma = buildPrisma([row({ resource: 'Shift', resourceId: 'sh-1' })]);

    const { data } = await build(prisma).search({}, TENANT);

    expect(data[0].patientName).toBeUndefined();
    expect(data[0].resourceName).toBeUndefined();
    expect(data[0].resourceId).toBe('sh-1');
  });
});
