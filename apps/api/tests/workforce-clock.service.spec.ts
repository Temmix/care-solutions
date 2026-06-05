import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkforceService } from '../src/modules/workforce/workforce.service';

// Focused spec for the mobile-driven clock-in/out behaviour: idempotent replays
// (offline queue) and device-captured timestamps.

const tenantId = 'tenant-1';
const userId = 'user-1';
const assignmentId = 'assign-1';

// A fixed past shift day so device-capture timestamps are never "in the future"
// relative to the real wall clock the service reads.
const SHIFT_DAY = '2020-01-01';
const capturedDuringShift = '2020-01-01T09:00:00.000Z';

function createMockPrisma() {
  return {
    clockRecord: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shiftAssignment: {
      findUnique: jest.fn(),
    },
  };
}

function createMockEvents() {
  return { emitClockIn: jest.fn(), emitClockOut: jest.fn() };
}

function makeAssignment(overrides: Record<string, unknown> = {}) {
  return {
    id: assignmentId,
    userId,
    clockRecord: null,
    shift: {
      tenantId,
      date: new Date(SHIFT_DAY),
      // All-day window so the chosen capture time is always inside it.
      shiftPattern: { startTime: '00:00', endTime: '23:59', breakMinutes: 0 },
      location: null,
    },
    ...overrides,
  };
}

describe('WorkforceService clock-in/out (mobile)', () => {
  let service: WorkforceService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let events: ReturnType<typeof createMockEvents>;

  beforeEach(() => {
    prisma = createMockPrisma();
    events = createMockEvents();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const notifications = {
      notify: jest.fn().mockResolvedValue(undefined),
      notifyMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new WorkforceService(
      prisma as any,
      events as any,
      audit as any,
      notifications as any,
    );
  });

  describe('clockIn', () => {
    it('returns the existing record on idempotent replay (same clientEventId)', async () => {
      const existing = { id: 'clock-1', userId, status: 'CLOCKED_IN' };
      prisma.clockRecord.findUnique.mockResolvedValue(existing);

      const result = await service.clockIn(
        { shiftAssignmentId: assignmentId, latitude: 1, longitude: 2, clientEventId: 'evt-1' },
        userId,
        tenantId,
      );

      expect(result).toBe(existing);
      expect(prisma.clockRecord.create).not.toHaveBeenCalled();
      expect(prisma.shiftAssignment.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a replayed clientEventId that belongs to another user', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue({ id: 'clock-1', userId: 'someone-else' });

      await expect(
        service.clockIn(
          { shiftAssignmentId: assignmentId, latitude: 1, longitude: 2, clientEventId: 'evt-1' },
          userId,
          tenantId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('persists clientEventId and uses capturedAt as the clock-in time', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());
      prisma.clockRecord.create.mockImplementation(({ data }: any) => ({ id: 'clock-1', ...data }));

      await service.clockIn(
        {
          shiftAssignmentId: assignmentId,
          latitude: 1,
          longitude: 2,
          clientEventId: 'evt-1',
          capturedAt: capturedDuringShift,
        },
        userId,
        tenantId,
      );

      const data = prisma.clockRecord.create.mock.calls[0][0].data;
      expect(data.clientEventId).toBe('evt-1');
      expect(data.clockInAt).toEqual(new Date(capturedDuringShift));
      expect(events.emitClockIn).toHaveBeenCalled();
    });

    it('rejects a captured time in the future', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(makeAssignment());

      await expect(
        service.clockIn(
          {
            shiftAssignmentId: assignmentId,
            latitude: 1,
            longitude: 2,
            capturedAt: '2999-01-01T00:00:00.000Z',
          },
          userId,
          tenantId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('clockOut', () => {
    it('returns the existing record on idempotent replay (same clientEventId)', async () => {
      const existing = { id: 'clock-1', userId, status: 'CLOCKED_OUT' };
      prisma.clockRecord.findUnique.mockResolvedValue(existing);

      const result = await service.clockOut(
        { shiftAssignmentId: assignmentId, clientEventId: 'out-1' },
        userId,
        tenantId,
      );

      expect(result).toBe(existing);
      expect(prisma.clockRecord.update).not.toHaveBeenCalled();
    });

    it('persists clockOutClientEventId and uses capturedAt as the clock-out time', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(
        makeAssignment({ clockRecord: { id: 'clock-1', status: 'CLOCKED_IN' } }),
      );
      prisma.clockRecord.update.mockImplementation(({ data }: any) => ({ id: 'clock-1', ...data }));

      await service.clockOut(
        {
          shiftAssignmentId: assignmentId,
          clientEventId: 'out-1',
          capturedAt: capturedDuringShift,
        },
        userId,
        tenantId,
      );

      const data = prisma.clockRecord.update.mock.calls[0][0].data;
      expect(data.clockOutClientEventId).toBe('out-1');
      expect(data.clockOutAt).toEqual(new Date(capturedDuringShift));
      expect(events.emitClockOut).toHaveBeenCalled();
    });
  });

  // Shift HH:mm are wall-clock times in Europe/London. In summer (BST, UTC+1)
  // a 07:00 shift starts at 06:00 UTC, so the window opens 05:30 UTC. Using a
  // past June date keeps these stable regardless of when the suite runs.
  describe('clockIn timezone window (Europe/London / BST)', () => {
    function summerAssignment() {
      return makeAssignment({
        shift: {
          tenantId,
          date: new Date('2020-06-05'), // June -> BST (UTC+1)
          shiftPattern: { startTime: '07:00', endTime: '19:00', breakMinutes: 0 },
          location: null,
        },
      });
    }

    it('accepts a clock-in at 07:00 BST (06:00 UTC) — would be "too early" under UTC', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(summerAssignment());
      prisma.clockRecord.create.mockImplementation(({ data }: any) => ({ id: 'c', ...data }));

      // 06:00 UTC = 07:00 BST: inside the window (opens 06:30 BST = 05:30 UTC).
      await service.clockIn(
        {
          shiftAssignmentId: assignmentId,
          latitude: 1,
          longitude: 2,
          capturedAt: '2020-06-05T06:00:00.000Z',
        },
        userId,
        tenantId,
      );
      expect(prisma.clockRecord.create).toHaveBeenCalled();
    });

    it('rejects a clock-in before the BST window opens (06:30 BST = 05:30 UTC)', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(summerAssignment());

      // 05:00 UTC = 06:00 BST: before the window opens at 06:30 BST.
      await expect(
        service.clockIn(
          {
            shiftAssignmentId: assignmentId,
            latitude: 1,
            longitude: 2,
            capturedAt: '2020-06-05T05:00:00.000Z',
          },
          userId,
          tenantId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
