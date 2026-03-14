import { DashboardService } from '../src/modules/epr/dashboard/dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    patient: { count: jest.Mock; findMany: jest.Mock; groupBy: jest.Mock };
    user: { count: jest.Mock };
    practitioner: { count: jest.Mock };
    patientEvent: { count: jest.Mock; findMany: jest.Mock };
    shift: { count: jest.Mock };
    encounter: { count: jest.Mock };
    bed: { count: jest.Mock };
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      patient: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      user: { count: jest.fn().mockResolvedValue(0) },
      practitioner: { count: jest.fn().mockResolvedValue(0) },
      patientEvent: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      shift: { count: jest.fn().mockResolvedValue(0) },
      encounter: { count: jest.fn().mockResolvedValue(0) },
      bed: { count: jest.fn().mockResolvedValue(0) },
    };

    service = new DashboardService(prisma as any);
  });

  it('should return stats scoped by tenantId', async () => {
    prisma.patient.count.mockResolvedValue(10);
    prisma.user.count.mockResolvedValue(5);
    prisma.practitioner.count.mockResolvedValue(3);
    prisma.patientEvent.count.mockResolvedValue(20);
    prisma.shift.count.mockResolvedValue(8);
    prisma.encounter.count.mockResolvedValue(4);
    prisma.bed.count.mockResolvedValue(12);
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patientEvent.findMany.mockResolvedValue([]);
    prisma.patient.groupBy.mockResolvedValue([]);

    const result = await service.getStats('tenant-1');

    expect(result.counts).toEqual({
      patients: 10,
      users: 5,
      practitioners: 3,
      events: 20,
      shifts: 8,
      encounters: 4,
      availableBeds: 12,
    });

    // Verify tenantId scoping
    expect(prisma.patient.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: 'tenant-1' }),
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ tenantId: 'tenant-1' }),
    });
  });

  it('should return stats without tenantId scoping for SUPER_ADMIN', async () => {
    prisma.patient.count.mockResolvedValue(50);
    prisma.user.count.mockResolvedValue(20);
    prisma.practitioner.count.mockResolvedValue(10);
    prisma.patientEvent.count.mockResolvedValue(100);
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patientEvent.findMany.mockResolvedValue([]);
    prisma.patient.groupBy.mockResolvedValue([]);

    const result = await service.getStats(null);

    expect(result.counts.patients).toBe(50);
    // Verify no tenantId in where clause
    const patientCountCall = prisma.patient.count.mock.calls[0][0];
    expect(patientCountCall.where.tenantId).toBeUndefined();
  });

  it('should handle empty data gracefully', async () => {
    const result = await service.getStats('tenant-1');

    expect(result.counts).toEqual({
      patients: 0,
      users: 0,
      practitioners: 0,
      events: 0,
      shifts: 0,
      encounters: 0,
      availableBeds: 0,
    });
    expect(result.recentPatients).toEqual([]);
    expect(result.recentEvents).toEqual([]);
    expect(result.genderBreakdown).toEqual([]);
  });

  it('should correctly map recentPatients, recentEvents, and genderBreakdown', async () => {
    const birthDate = new Date('1990-05-15');
    const createdAt = new Date('2025-01-01T10:00:00Z');
    const occurredAt = new Date('2025-01-02T12:00:00Z');

    prisma.patient.count.mockResolvedValue(1);
    prisma.user.count.mockResolvedValue(1);
    prisma.practitioner.count.mockResolvedValue(1);
    prisma.patientEvent.count.mockResolvedValue(1);

    prisma.patient.findMany.mockResolvedValue([
      {
        id: 'p1',
        givenName: 'Jane',
        familyName: 'Smith',
        gender: 'FEMALE',
        birthDate,
        createdAt,
      },
    ]);

    prisma.patientEvent.findMany.mockResolvedValue([
      {
        id: 'e1',
        eventType: 'CREATED',
        summary: 'Patient created',
        occurredAt,
        patient: { givenName: 'Jane', familyName: 'Smith' },
        recordedBy: { firstName: 'Dr', lastName: 'Who' },
      },
    ]);

    prisma.patient.groupBy.mockResolvedValue([
      { gender: 'FEMALE', _count: 1 },
      { gender: 'MALE', _count: 2 },
    ]);

    const result = await service.getStats('tenant-1');

    expect(result.recentPatients).toEqual([
      {
        id: 'p1',
        name: 'Jane Smith',
        gender: 'FEMALE',
        birthDate: '1990-05-15',
        createdAt: createdAt.toISOString(),
      },
    ]);

    expect(result.recentEvents).toEqual([
      {
        id: 'e1',
        eventType: 'CREATED',
        summary: 'Patient created',
        occurredAt: occurredAt.toISOString(),
        patientName: 'Jane Smith',
        recordedBy: 'Dr Who',
      },
    ]);

    expect(result.genderBreakdown).toEqual([
      { gender: 'FEMALE', count: 1 },
      { gender: 'MALE', count: 2 },
    ]);
  });
});
