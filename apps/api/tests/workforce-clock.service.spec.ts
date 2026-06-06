import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkforceService } from '../src/modules/workforce/workforce.service';
import { orgCalendarDayUtc } from '../src/modules/workforce/shift-time';

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
      findMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn().mockResolvedValue({ timezone: 'Europe/London' }),
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

    it('applies the org timezone — a New York org rejects what London would accept', async () => {
      prisma.clockRecord.findUnique.mockResolvedValue(null);
      prisma.shiftAssignment.findUnique.mockResolvedValue(summerAssignment());
      // Same shift, but the tenant is in America/New_York (EDT, UTC-4): 07:00
      // local = 11:00 UTC, so the window opens 10:30 UTC.
      prisma.organization.findUnique.mockResolvedValue({ timezone: 'America/New_York' });

      // 08:00 UTC is inside London's window (open) but before New York's (10:30).
      await expect(
        service.clockIn(
          {
            shiftAssignmentId: assignmentId,
            latitude: 1,
            longitude: 2,
            capturedAt: '2020-06-05T08:00:00.000Z',
          },
          userId,
          tenantId,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getMyShiftsToday (overnight / timezone)', () => {
    it('computes "today" in the org timezone, not the server UTC day', async () => {
      prisma.organization.findUnique.mockResolvedValue({ timezone: 'Europe/London' });
      prisma.shiftAssignment.findMany.mockResolvedValue([]);

      await service.getMyShiftsToday(userId, tenantId);

      const where = prisma.shiftAssignment.findMany.mock.calls[0][0].where;
      const dateRange = where.OR[0].shift.date;
      // Expected boundary = UTC midnight of the current Europe/London calendar day.
      const expected = orgCalendarDayUtc('Europe/London');
      expect(dateRange.gte.getTime()).toBe(expected.getTime());
      // Window is exactly one day wide.
      expect(dateRange.lt.getTime() - dateRange.gte.getTime()).toBe(24 * 60 * 60_000);
    });

    it('includes any shift with an open clock-in regardless of date (overnight clock-out)', async () => {
      prisma.organization.findUnique.mockResolvedValue({ timezone: 'Europe/London' });
      prisma.shiftAssignment.findMany.mockResolvedValue([]);

      await service.getMyShiftsToday(userId, tenantId);

      const where = prisma.shiftAssignment.findMany.mock.calls[0][0].where;
      // Second OR branch matches assignments still clocked in (no clock-out yet).
      expect(where.OR).toContainEqual({ clockRecord: { is: { clockOutAt: null } } });
    });

    it('returns an in-progress overnight shift so the worker can still clock out', async () => {
      prisma.organization.findUnique.mockResolvedValue({ timezone: 'Europe/London' });
      // A shift far in the future keeps lazy auto-clock-out a no-op, so the open
      // record stays CLOCKED_IN — modelling a shift whose window hasn't ended.
      const openOvernight = makeAssignment({
        clockRecord: {
          id: 'clock-1',
          status: 'CLOCKED_IN',
          clockInAt: new Date(),
          clockOutAt: null,
        },
        shift: {
          tenantId,
          date: new Date('2999-01-01'),
          shiftPattern: { startTime: '20:00', endTime: '08:00', breakMinutes: 0 },
          location: null,
        },
      });
      prisma.shiftAssignment.findMany.mockResolvedValue([openOvernight]);

      const result = await service.getMyShiftsToday(userId, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].clockRecord?.status).toBe('CLOCKED_IN');
      expect(prisma.clockRecord.update).not.toHaveBeenCalled();
    });
  });
});
