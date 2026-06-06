import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ShiftReportsService } from '../src/modules/shift-reports/shift-reports.service';

// Focused spec for the shift-report gating: clock-in required, reporting window
// (shift end + 1hr), location-scoped patient access, offline idempotency, and
// the patient-timeline mirror. Uses a January (GMT = UTC) shift so the window
// instants are predictable.

const userId = 'user-1';
const tenantId = 'tenant-1';
const assignmentId = 'assign-1';

function createTx() {
  return {
    shiftReport: { create: jest.fn(({ data }: any) => ({ id: 'rep-1', ...data })) },
    patientEvent: { create: jest.fn().mockResolvedValue({ id: 'evt-1' }) },
  };
}
let tx = createTx();

function createMockPrisma() {
  return {
    shiftReport: { findUnique: jest.fn().mockResolvedValue(null) },
    shiftAssignment: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn().mockResolvedValue({ timezone: 'Europe/London' }) },
    location: { findMany: jest.fn().mockResolvedValue([{ id: 'loc-1', parentId: null }]) },
    encounter: { findMany: jest.fn().mockResolvedValue([]) },
    patient: { findMany: jest.fn().mockResolvedValue([]) },
    bed: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: (t: any) => Promise<any>) => fn(tx)),
  };
}

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: assignmentId,
    userId,
    clockRecord: { id: 'cr-1', status: 'CLOCKED_IN', clockInAt: new Date('2020-01-01T07:00:00Z') },
    shift: {
      id: 'shift-1',
      tenantId,
      locationId: 'loc-1',
      date: new Date('2020-01-01'), // GMT
      shiftPattern: { startTime: '07:00', endTime: '19:00', breakMinutes: 0 },
      location: { id: 'loc-1', type: 'WARD' },
    },
    ...overrides,
  };
}

function baseDto(over: Record<string, unknown> = {}) {
  return {
    shiftAssignmentId: assignmentId,
    patientId: 'p1',
    content: 'Resident ate well at lunch.',
    capturedAt: '2020-01-01T10:00:00.000Z', // inside the window (closes 20:00 UTC)
    ...over,
  } as any;
}

describe('ShiftReportsService.createShiftReport', () => {
  let service: ShiftReportsService;
  let prisma: ReturnType<typeof createMockPrisma>;
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  beforeEach(() => {
    tx = createTx();
    prisma = createMockPrisma();
    service = new ShiftReportsService(prisma as any, audit as any);
  });

  it('files a report on an inpatient (encounter → bed) and mirrors a PatientEvent', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());
    prisma.encounter.findMany.mockResolvedValue([{ id: 'enc-1', patientId: 'p1', bedId: 'bed-1' }]);

    const report = await service.createShiftReport(baseDto(), userId, tenantId);

    const data = tx.shiftReport.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      patientId: 'p1',
      encounterId: 'enc-1',
      bedId: 'bed-1',
      locationId: 'loc-1',
      recordedById: userId,
    });
    expect(tx.patientEvent.create).toHaveBeenCalled();
    expect(tx.patientEvent.create.mock.calls[0][0].data.eventType).toBe('NOTE');
    expect(audit.log).toHaveBeenCalled();
    expect(report.id).toBe('rep-1');
  });

  it('files a report on a community patient (home location, no bed/encounter)', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());
    prisma.patient.findMany.mockResolvedValue([{ id: 'p2' }]);

    await service.createShiftReport(baseDto({ patientId: 'p2' }), userId, tenantId);

    const data = tx.shiftReport.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ patientId: 'p2', encounterId: null, bedId: null });
  });

  it('rejects a report after the window closes (shift end + 1hr)', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());
    prisma.encounter.findMany.mockResolvedValue([{ id: 'enc-1', patientId: 'p1', bedId: null }]);

    // 21:00 UTC is past the 20:00 UTC close.
    await expect(
      service.createShiftReport(
        baseDto({ capturedAt: '2020-01-01T21:00:00.000Z' }),
        userId,
        tenantId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.shiftReport.create).not.toHaveBeenCalled();
  });

  it('rejects when the worker has not clocked in', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment({ clockRecord: null }));

    await expect(service.createShiftReport(baseDto(), userId, tenantId)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a patient who is not at the shift location', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());
    // No encounters, no home patients → allowed set is empty.
    await expect(
      service.createShiftReport(baseDto({ patientId: 'stranger' }), userId, tenantId),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects filing against another worker’s shift', async () => {
    prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment({ userId: 'someone-else' }));

    await expect(service.createShiftReport(baseDto(), userId, tenantId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns the existing record on idempotent replay (same clientEventId)', async () => {
    const existing = { id: 'rep-existing', recordedById: userId };
    prisma.shiftReport.findUnique.mockResolvedValue(existing);

    const result = await service.createShiftReport(
      baseDto({ clientEventId: '11111111-1111-4111-8111-111111111111' }),
      userId,
      tenantId,
    );

    expect(result).toBe(existing);
    expect(prisma.shiftAssignment.findUnique).not.toHaveBeenCalled();
  });
});
