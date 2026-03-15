import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkforceService } from '../src/modules/workforce/workforce.service';

// ── Mock Prisma ──────────────────────────────────────

function createMockPrisma() {
  return {
    shiftPattern: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    shift: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    shiftAssignment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    staffAvailability: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    userTenantMembership: {
      findMany: jest.fn(),
    },
    shiftSwapRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockTx)),
  };
}

// Transaction mock that mirrors prisma methods
const mockTx = {
  shiftAssignment: { update: jest.fn() },
  shiftSwapRequest: { update: jest.fn() },
};

function createMockEventsService() {
  return {
    emitSwapCreated: jest.fn(),
    emitSwapUpdated: jest.fn(),
    emitBedStatusChanged: jest.fn(),
    emitDischargePlanUpdated: jest.fn(),
  };
}

type MockPrisma = ReturnType<typeof createMockPrisma>;

// ── Test data factories ──────────────────────────────

const tenantId = 'tenant-1';

function makeShiftPattern(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pat-1',
    name: 'Early',
    shiftType: 'EARLY',
    startTime: '07:00',
    endTime: '15:00',
    breakMinutes: 30,
    color: null,
    isActive: true,
    tenantId,
    ...overrides,
  };
}

function makeShift(overrides: Record<string, unknown> = {}) {
  return {
    id: 'shift-1',
    date: new Date('2026-03-20'),
    status: 'DRAFT',
    notes: null,
    tenantId,
    shiftPatternId: 'pat-1',
    shiftPattern: makeShiftPattern(),
    location: null,
    assignments: [],
    ...overrides,
  };
}

function makeMember(userId: string, firstName: string, lastName: string, role = 'CARER') {
  return {
    id: `mem-${userId}`,
    userId,
    organizationId: tenantId,
    role,
    status: 'ACTIVE',
    user: { id: userId, firstName, lastName, role },
  };
}

// ── Tests ────────────────────────────────────────────

describe('WorkforceService', () => {
  let service: WorkforceService;
  let prisma: MockPrisma;
  let eventsService: ReturnType<typeof createMockEventsService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    eventsService = createMockEventsService();
    // Reset transaction mocks
    mockTx.shiftAssignment.update.mockReset();
    mockTx.shiftSwapRequest.update.mockReset();
    service = new WorkforceService(prisma as any, eventsService as any);
  });

  // ── Shift Patterns ──────────────────────────────────

  describe('createShiftPattern', () => {
    it('should create a shift pattern with tenantId', async () => {
      const dto = {
        name: 'Night',
        shiftType: 'NIGHT',
        startTime: '21:00',
        endTime: '07:00',
        breakMinutes: 30,
      };
      prisma.shiftPattern.create.mockResolvedValue({ id: 'pat-new', ...dto, tenantId });

      const result = await service.createShiftPattern(dto as any, tenantId);

      expect(prisma.shiftPattern.create).toHaveBeenCalledWith({
        data: { ...dto, tenantId },
      });
      expect(result.name).toBe('Night');
    });
  });

  describe('listShiftPatterns', () => {
    it('should filter by tenantId when provided', async () => {
      prisma.shiftPattern.findMany.mockResolvedValue([]);

      await service.listShiftPatterns(tenantId);

      expect(prisma.shiftPattern.findMany).toHaveBeenCalledWith({
        where: { isActive: true, tenantId },
        orderBy: { name: 'asc' },
      });
    });

    it('should list all active patterns when tenantId is null', async () => {
      prisma.shiftPattern.findMany.mockResolvedValue([]);

      await service.listShiftPatterns(null);

      expect(prisma.shiftPattern.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('updateShiftPattern', () => {
    it('should throw NotFoundException when pattern does not exist', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(null);

      await expect(
        service.updateShiftPattern('pat-x', { name: 'New' } as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update an existing pattern', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(makeShiftPattern());
      prisma.shiftPattern.update.mockResolvedValue(makeShiftPattern({ name: 'Updated' }));

      const result = await service.updateShiftPattern(
        'pat-1',
        { name: 'Updated' } as any,
        tenantId,
      );

      expect(result.name).toBe('Updated');
    });
  });

  describe('deleteShiftPattern', () => {
    it('should throw NotFoundException when pattern does not exist', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(null);

      await expect(service.deleteShiftPattern('pat-x', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should soft-delete by setting isActive to false', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(makeShiftPattern());

      await service.deleteShiftPattern('pat-1', tenantId);

      expect(prisma.shiftPattern.update).toHaveBeenCalledWith({
        where: { id: 'pat-1' },
        data: { isActive: false },
      });
    });
  });

  // ── Shifts ──────────────────────────────────────────

  describe('createShift', () => {
    it('should throw BadRequestException for past dates', async () => {
      await expect(
        service.createShift({ date: '2020-01-01', shiftPatternId: 'pat-1' } as any, tenantId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when pattern does not exist', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(null);

      await expect(
        service.createShift({ date: '2099-12-01', shiftPatternId: 'pat-x' } as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a shift for a future date', async () => {
      prisma.shiftPattern.findFirst.mockResolvedValue(makeShiftPattern());
      prisma.shift.create.mockResolvedValue(makeShift());

      const result = await service.createShift(
        { date: '2099-12-01', shiftPatternId: 'pat-1' } as any,
        tenantId,
      );

      expect(result.id).toBe('shift-1');
      expect(prisma.shift.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ shiftPatternId: 'pat-1', tenantId }),
        }),
      );
    });
  });

  describe('getShift', () => {
    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.getShift('shift-x', tenantId)).rejects.toThrow(NotFoundException);
    });

    it('should return shift with includes', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift());

      const result = await service.getShift('shift-1', tenantId);

      expect(result.id).toBe('shift-1');
    });
  });

  describe('updateShift', () => {
    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(
        service.updateShift('shift-x', { status: 'PUBLISHED' }, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updates to COMPLETED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'COMPLETED' }));

      await expect(service.updateShift('shift-1', { notes: 'new note' }, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject updates to CANCELLED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'CANCELLED' }));

      await expect(service.updateShift('shift-1', { notes: 'new note' }, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject publishing a shift with no assignments', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ assignments: [] }));

      await expect(
        service.updateShift('shift-1', { status: 'PUBLISHED' }, tenantId),
      ).rejects.toThrow('no staff have been assigned');
    });

    it('should reject reverting a PUBLISHED shift to DRAFT', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'PUBLISHED' }));

      await expect(service.updateShift('shift-1', { status: 'DRAFT' }, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow cancelling a PUBLISHED shift', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'PUBLISHED' }));
      prisma.shift.update.mockResolvedValue(makeShift({ status: 'CANCELLED' }));

      const result = await service.updateShift('shift-1', { status: 'CANCELLED' }, tenantId);

      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('deleteShift', () => {
    it('should reject deleting PUBLISHED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'PUBLISHED' }));

      await expect(service.deleteShift('shift-1', tenantId)).rejects.toThrow(BadRequestException);
    });

    it('should reject deleting COMPLETED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'COMPLETED' }));

      await expect(service.deleteShift('shift-1', tenantId)).rejects.toThrow(BadRequestException);
    });

    it('should delete a DRAFT shift with future date', async () => {
      prisma.shift.findFirst.mockResolvedValue(
        makeShift({ status: 'DRAFT', date: new Date('2099-12-01') }),
      );

      await service.deleteShift('shift-1', tenantId);

      expect(prisma.shiftAssignment.deleteMany).toHaveBeenCalledWith({
        where: { shiftId: 'shift-1' },
      });
      expect(prisma.shift.delete).toHaveBeenCalledWith({ where: { id: 'shift-1' } });
    });
  });

  // ── Assignment validation ───────────────────────────

  describe('assignShift', () => {
    const dto = { userId: 'user-1' };

    beforeEach(() => {
      // Default: shift exists, no conflicts
      prisma.shift.findFirst.mockResolvedValue(makeShift({ date: new Date('2026-03-20') }));
      prisma.staffAvailability.findMany.mockResolvedValue([]);
      prisma.staffAvailability.findFirst.mockResolvedValue(null);
      prisma.shiftAssignment.findMany.mockResolvedValue([]);
      prisma.shiftAssignment.create.mockResolvedValue({
        id: 'assign-1',
        shiftId: 'shift-1',
        userId: 'user-1',
        role: null,
        user: { id: 'user-1', firstName: 'Jane', lastName: 'Doe', role: 'CARER' },
      });
    });

    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.assignShift('shift-x', dto as any, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject assignment to COMPLETED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'COMPLETED' }));

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject assignment to CANCELLED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'CANCELLED' }));

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block assignment when staff is on leave', async () => {
      prisma.staffAvailability.findMany
        .mockResolvedValueOnce([
          { type: 'ANNUAL_LEAVE', date: new Date('2026-03-20'), endDate: null },
        ])
        .mockResolvedValue([]);

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        'annual leave',
      );
    });

    it('should block assignment when staff is unavailable with date range', async () => {
      prisma.staffAvailability.findMany
        .mockResolvedValueOnce([
          { type: 'UNAVAILABLE', date: new Date('2026-03-18'), endDate: new Date('2026-03-22') },
        ])
        .mockResolvedValue([]);

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        'unavailable',
      );
    });

    it('should block when shift overlaps with existing same-day assignment', async () => {
      prisma.staffAvailability.findMany.mockResolvedValue([]);
      // Same-day assignments query (second call)
      prisma.shiftAssignment.findMany
        .mockResolvedValueOnce([
          {
            userId: 'user-1',
            shift: {
              date: new Date('2026-03-20'),
              shiftPattern: { name: 'Morning', startTime: '06:00', endTime: '14:00' },
            },
          },
        ])
        .mockResolvedValue([]); // adjacent + weekly

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        'overlaps',
      );
    });

    it('should block when rest period is insufficient', async () => {
      prisma.staffAvailability.findMany.mockResolvedValue([]);
      prisma.shiftAssignment.findMany
        .mockResolvedValueOnce([]) // same-day: no overlap
        .mockResolvedValueOnce([
          {
            userId: 'user-1',
            shift: {
              date: new Date('2026-03-19'),
              shiftPattern: { name: 'Late', startTime: '14:00', endTime: '22:00' },
            },
          },
        ]) // adjacent: previous day late shift
        .mockResolvedValue([]); // weekly

      await expect(service.assignShift('shift-1', dto as any, tenantId)).rejects.toThrow(
        'rest period',
      );
    });

    it('should create assignment and return warnings for training conflict', async () => {
      prisma.staffAvailability.findMany.mockResolvedValue([]); // no blocking availability
      prisma.shiftAssignment.findMany.mockResolvedValue([]); // no conflicts
      prisma.staffAvailability.findFirst.mockResolvedValue({
        type: 'TRAINING',
        date: new Date('2026-03-20'),
      });

      const result = await service.assignShift('shift-1', dto as any, tenantId);

      expect(result.warnings).toContain('Staff member has training scheduled on this date');
      expect(prisma.shiftAssignment.create).toHaveBeenCalled();
    });

    it('should create assignment with no warnings when no conflicts', async () => {
      const result = await service.assignShift('shift-1', dto as any, tenantId);

      expect(result.id).toBe('assign-1');
      expect(result.warnings).toEqual([]);
    });
  });

  // ── Availability ────────────────────────────────────

  describe('createAvailability', () => {
    it('should create availability record', async () => {
      const dto = { date: '2026-03-20', type: 'AVAILABLE' };
      prisma.staffAvailability.create.mockResolvedValue({ id: 'avail-1', ...dto });

      const result = await service.createAvailability(dto as any, 'user-1', tenantId);

      expect(result.id).toBe('avail-1');
    });

    it('should throw when endDate is before start date', async () => {
      const dto = { date: '2026-03-25', endDate: '2026-03-20', type: 'ANNUAL_LEAVE' };

      await expect(service.createAvailability(dto as any, 'user-1', tenantId)).rejects.toThrow(
        'End date cannot be before start date',
      );
    });

    it('should accept valid date range', async () => {
      const dto = { date: '2026-03-20', endDate: '2026-03-25', type: 'ANNUAL_LEAVE' };
      prisma.staffAvailability.create.mockResolvedValue({ id: 'avail-2', ...dto });

      await service.createAvailability(dto as any, 'user-1', tenantId);

      expect(prisma.staffAvailability.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: new Date('2026-03-20'),
          endDate: new Date('2026-03-25'),
        }),
      });
    });
  });

  describe('deleteAvailability', () => {
    it('should throw NotFoundException when record does not exist', async () => {
      prisma.staffAvailability.findFirst.mockResolvedValue(null);

      await expect(service.deleteAvailability('avail-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete existing availability record', async () => {
      prisma.staffAvailability.findFirst.mockResolvedValue({ id: 'avail-1' });

      await service.deleteAvailability('avail-1', 'user-1');

      expect(prisma.staffAvailability.delete).toHaveBeenCalledWith({ where: { id: 'avail-1' } });
    });
  });

  // ── getAssignableStaff ──────────────────────────────

  describe('getAssignableStaff', () => {
    const shift = makeShift({ date: new Date('2026-03-20'), assignments: [] });

    beforeEach(() => {
      prisma.shift.findFirst.mockResolvedValue(shift);
      prisma.userTenantMembership.findMany.mockResolvedValue([
        makeMember('u1', 'Alice', 'Smith'),
        makeMember('u2', 'Bob', 'Jones'),
        makeMember('u3', 'Carol', 'White', 'NURSE'),
      ]);
      prisma.staffAvailability.findMany.mockResolvedValue([]);
      prisma.shiftAssignment.findMany.mockResolvedValue([]);
    });

    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.getAssignableStaff('shift-x', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all members as available when no conflicts', async () => {
      const result = await service.getAssignableStaff('shift-1', tenantId);

      expect(result).toHaveLength(3);
      expect(result.every((r: any) => r.status === 'available')).toBe(true);
      expect(result.every((r: any) => r.alreadyAssigned === false)).toBe(true);
    });

    it('should mark already-assigned staff as blocked', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ assignments: [{ userId: 'u1' }] }));

      const result = await service.getAssignableStaff('shift-1', tenantId);

      const alice = result.find((r: any) => r.id === 'u1')!;
      expect(alice.status).toBe('blocked');
      expect(alice.alreadyAssigned).toBe(true);
      expect(alice.reasons).toContain('Already assigned to this shift');
    });

    it('should mark staff with blocking availability as blocked', async () => {
      prisma.staffAvailability.findMany.mockResolvedValue([
        {
          userId: 'u2',
          type: 'ANNUAL_LEAVE',
          date: new Date('2026-03-18'),
          endDate: new Date('2026-03-22'),
        },
      ]);

      const result = await service.getAssignableStaff('shift-1', tenantId);

      const bob = result.find((r: any) => r.id === 'u2')!;
      expect(bob.status).toBe('blocked');
      expect(bob.reasons[0]).toMatch(/annual leave/);
      expect(bob.reasons[0]).toMatch(/2026-03-18/);
    });

    it('should mark staff with overlapping shifts as blocked', async () => {
      prisma.shiftAssignment.findMany
        .mockResolvedValueOnce([
          {
            userId: 'u3',
            shift: {
              date: new Date('2026-03-20'),
              status: 'DRAFT',
              shiftPattern: { name: 'Morning', startTime: '06:00', endTime: '14:00' },
            },
          },
        ])
        .mockResolvedValue([]); // adjacent

      const result = await service.getAssignableStaff('shift-1', tenantId);

      const carol = result.find((r: any) => r.id === 'u3')!;
      expect(carol.status).toBe('blocked');
      expect(carol.reasons[0]).toMatch(/Overlaps/);
    });

    it('should mark staff with insufficient rest as blocked', async () => {
      prisma.shiftAssignment.findMany
        .mockResolvedValueOnce([]) // same-day: no overlap
        .mockResolvedValueOnce([
          {
            userId: 'u1',
            shift: {
              date: new Date('2026-03-19'),
              shiftPattern: { name: 'Late', startTime: '14:00', endTime: '22:00' },
            },
          },
        ]); // adjacent: previous day late shift → only 9h rest before 07:00

      const result = await service.getAssignableStaff('shift-1', tenantId);

      const alice = result.find((r: any) => r.id === 'u1')!;
      expect(alice.status).toBe('blocked');
      expect(alice.reasons[0]).toMatch(/rest/);
    });

    it('should mark staff with training as warning (not blocked)', async () => {
      prisma.staffAvailability.findMany.mockResolvedValue([
        {
          userId: 'u1',
          type: 'TRAINING',
          date: new Date('2026-03-20'),
          endDate: null,
        },
      ]);

      const result = await service.getAssignableStaff('shift-1', tenantId);

      const alice = result.find((r: any) => r.id === 'u1')!;
      expect(alice.status).toBe('warning');
      expect(alice.reasons[0]).toMatch(/training/);
      expect(alice.alreadyAssigned).toBe(false);
    });

    it('should sort results: available first, warnings second, blocked last', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ assignments: [{ userId: 'u2' }] }));
      prisma.staffAvailability.findMany.mockResolvedValue([
        { userId: 'u1', type: 'TRAINING', date: new Date('2026-03-20'), endDate: null },
      ]);

      const result = await service.getAssignableStaff('shift-1', tenantId);

      // u3 = available, u1 = warning (training), u2 = blocked (assigned)
      expect(result[0].id).toBe('u3');
      expect(result[0].status).toBe('available');
      expect(result[1].id).toBe('u1');
      expect(result[1].status).toBe('warning');
      expect(result[2].id).toBe('u2');
      expect(result[2].status).toBe('blocked');
    });

    it('should include membershipRole from membership record', async () => {
      const result = await service.getAssignableStaff('shift-1', tenantId);

      const carol = result.find((r: any) => r.id === 'u3')!;
      expect(carol.membershipRole).toBe('NURSE');
    });
  });

  // ── removeAssignment ────────────────────────────────

  describe('removeAssignment', () => {
    it('should throw NotFoundException when shift does not exist', async () => {
      prisma.shift.findFirst.mockResolvedValue(null);

      await expect(service.removeAssignment('shift-x', 'user-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject removal from COMPLETED shifts', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift({ status: 'COMPLETED' }));

      await expect(service.removeAssignment('shift-1', 'user-1', tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should delete assignment by composite key', async () => {
      prisma.shift.findFirst.mockResolvedValue(makeShift());

      await service.removeAssignment('shift-1', 'user-1', tenantId);

      expect(prisma.shiftAssignment.delete).toHaveBeenCalledWith({
        where: { shiftId_userId: { shiftId: 'shift-1', userId: 'user-1' } },
      });
    });
  });

  // ── Shift Swap Marketplace ────────────────────────────

  describe('createSwapRequest', () => {
    const dto = { originalShiftAssignmentId: 'assign-1', reason: 'Personal' };

    it('should throw NotFoundException when assignment does not belong to user', async () => {
      prisma.shiftAssignment.findFirst.mockResolvedValue(null);

      await expect(service.createSwapRequest(dto as any, 'user-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject swap for completed shift', async () => {
      prisma.shiftAssignment.findFirst.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-1',
        shift: { status: 'COMPLETED', shiftPattern: makeShiftPattern() },
      });

      await expect(service.createSwapRequest(dto as any, 'user-1', tenantId)).rejects.toThrow(
        'completed or cancelled',
      );
    });

    it('should reject swap for cancelled shift', async () => {
      prisma.shiftAssignment.findFirst.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-1',
        shift: { status: 'CANCELLED', shiftPattern: makeShiftPattern() },
      });

      await expect(service.createSwapRequest(dto as any, 'user-1', tenantId)).rejects.toThrow(
        'completed or cancelled',
      );
    });

    it('should reject when a pending/accepted swap already exists', async () => {
      prisma.shiftAssignment.findFirst.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-1',
        shift: { status: 'PUBLISHED', shiftPattern: makeShiftPattern() },
      });
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({ id: 'existing-swap' });

      await expect(service.createSwapRequest(dto as any, 'user-1', tenantId)).rejects.toThrow(
        'already exists',
      );
    });

    it('should create swap request and emit event', async () => {
      prisma.shiftAssignment.findFirst.mockResolvedValue({
        id: 'assign-1',
        userId: 'user-1',
        shift: { status: 'PUBLISHED', shiftPattern: makeShiftPattern() },
      });
      prisma.shiftSwapRequest.findFirst.mockResolvedValue(null);
      prisma.shiftSwapRequest.create.mockResolvedValue({
        id: 'swap-1',
        requester: { id: 'user-1', firstName: 'Jane', lastName: 'Doe' },
        originalShiftAssignment: {
          shift: { date: new Date('2026-03-20'), shiftPattern: makeShiftPattern() },
        },
      });

      const result = await service.createSwapRequest(dto as any, 'user-1', tenantId);

      expect(result.id).toBe('swap-1');
      expect(eventsService.emitSwapCreated).toHaveBeenCalledWith(tenantId, {
        swapId: 'swap-1',
        requesterName: 'Jane Doe',
        shiftDate: '2026-03-20',
      });
    });
  });

  describe('getOpenSwaps', () => {
    it('should query pending swaps for tenant', async () => {
      prisma.shiftSwapRequest.findMany.mockResolvedValue([]);

      await service.getOpenSwaps(tenantId);

      expect(prisma.shiftSwapRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: 'PENDING' },
        }),
      );
    });
  });

  describe('getMySwapRequests', () => {
    it('should query swaps where user is requester or responder', async () => {
      prisma.shiftSwapRequest.findMany.mockResolvedValue([]);

      await service.getMySwapRequests('user-1', tenantId);

      expect(prisma.shiftSwapRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId,
            OR: [{ requesterId: 'user-1' }, { responderId: 'user-1' }],
          },
        }),
      );
    });
  });

  describe('getPendingApprovals', () => {
    it('should query accepted swaps for tenant', async () => {
      prisma.shiftSwapRequest.findMany.mockResolvedValue([]);

      await service.getPendingApprovals(tenantId);

      expect(prisma.shiftSwapRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: 'ACCEPTED' },
        }),
      );
    });
  });

  describe('respondToSwap', () => {
    const dto = { targetShiftAssignmentId: 'assign-2' };

    it('should throw NotFoundException when swap not found or not pending', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue(null);

      await expect(service.respondToSwap('swap-1', dto as any, 'user-2', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if user responds to own swap', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        requesterId: 'user-1',
        status: 'PENDING',
      });

      await expect(service.respondToSwap('swap-1', dto as any, 'user-1', tenantId)).rejects.toThrow(
        'cannot respond to your own',
      );
    });

    it('should reject if target assignment does not belong to responder', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        requesterId: 'user-1',
        status: 'PENDING',
      });
      prisma.shiftAssignment.findFirst.mockResolvedValue(null);

      await expect(service.respondToSwap('swap-1', dto as any, 'user-2', tenantId)).rejects.toThrow(
        'does not belong to you',
      );
    });

    it('should update swap to ACCEPTED with responder info', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        requesterId: 'user-1',
        status: 'PENDING',
      });
      prisma.shiftAssignment.findFirst.mockResolvedValue({ id: 'assign-2', userId: 'user-2' });
      prisma.shiftSwapRequest.update.mockResolvedValue({
        id: 'swap-1',
        status: 'ACCEPTED',
        responderId: 'user-2',
      });

      const result = await service.respondToSwap('swap-1', dto as any, 'user-2', tenantId);

      expect(result.status).toBe('ACCEPTED');
      expect(prisma.shiftSwapRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACCEPTED',
            responderId: 'user-2',
            targetShiftAssignmentId: 'assign-2',
          }),
        }),
      );
    });
  });

  describe('approveSwap', () => {
    it('should throw NotFoundException when swap not found or not accepted', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue(null);

      await expect(service.approveSwap('swap-1', 'admin-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject when no target assignment exists', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        status: 'ACCEPTED',
        originalShiftAssignment: { userId: 'user-1', shift: { shiftPattern: makeShiftPattern() } },
        targetShiftAssignment: null,
        originalShiftAssignmentId: 'assign-1',
        targetShiftAssignmentId: null,
      });

      await expect(service.approveSwap('swap-1', 'admin-1', tenantId)).rejects.toThrow(
        'No target assignment',
      );
    });

    it('should swap user assignments in transaction and emit event', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        status: 'ACCEPTED',
        originalShiftAssignment: { userId: 'user-1', shift: { shiftPattern: makeShiftPattern() } },
        targetShiftAssignment: { userId: 'user-2', shift: { shiftPattern: makeShiftPattern() } },
        originalShiftAssignmentId: 'assign-1',
        targetShiftAssignmentId: 'assign-2',
      });
      mockTx.shiftSwapRequest.update.mockResolvedValue({
        id: 'swap-1',
        status: 'APPROVED',
        approvedById: 'admin-1',
      });

      const result = await service.approveSwap('swap-1', 'admin-1', tenantId);

      // Should swap user IDs on both assignments
      expect(mockTx.shiftAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assign-1' },
        data: { userId: 'user-2' },
      });
      expect(mockTx.shiftAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assign-2' },
        data: { userId: 'user-1' },
      });
      expect(result.status).toBe('APPROVED');
      expect(eventsService.emitSwapUpdated).toHaveBeenCalledWith(tenantId, {
        swapId: 'swap-1',
        status: 'APPROVED',
      });
    });
  });

  describe('rejectSwap', () => {
    it('should throw NotFoundException when swap not found', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue(null);

      await expect(
        service.rejectSwap('swap-1', 'Not suitable', 'admin-1', tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update swap to REJECTED with manager note', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({ id: 'swap-1', status: 'ACCEPTED' });
      prisma.shiftSwapRequest.update.mockResolvedValue({ id: 'swap-1', status: 'REJECTED' });

      await service.rejectSwap('swap-1', 'Staffing too low', 'admin-1', tenantId);

      expect(prisma.shiftSwapRequest.update).toHaveBeenCalledWith({
        where: { id: 'swap-1' },
        data: { status: 'REJECTED', managerNote: 'Staffing too low', approvedById: 'admin-1' },
      });
    });
  });

  describe('cancelSwapRequest', () => {
    it('should throw NotFoundException when swap not found', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue(null);

      await expect(service.cancelSwapRequest('swap-1', 'user-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if user is not the requester', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        requesterId: 'user-1',
        status: 'PENDING',
      });

      await expect(service.cancelSwapRequest('swap-1', 'user-2', tenantId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should update swap to CANCELLED when requester cancels', async () => {
      prisma.shiftSwapRequest.findFirst.mockResolvedValue({
        id: 'swap-1',
        requesterId: 'user-1',
        status: 'PENDING',
      });
      prisma.shiftSwapRequest.update.mockResolvedValue({ id: 'swap-1', status: 'CANCELLED' });

      await service.cancelSwapRequest('swap-1', 'user-1', tenantId);

      expect(prisma.shiftSwapRequest.update).toHaveBeenCalledWith({
        where: { id: 'swap-1' },
        data: { status: 'CANCELLED' },
      });
    });
  });

  // ── Compliance Dashboard ──────────────────────────────

  describe('getComplianceReport', () => {
    it('should return report with zero violations when no shifts exist', async () => {
      prisma.shift.findMany.mockResolvedValue([]);
      prisma.userTenantMembership.findMany.mockResolvedValue([makeMember('u1', 'Alice', 'Smith')]);

      const report = await service.getComplianceReport(tenantId, '2026-03-01', '2026-03-07');

      expect(report.summary.totalStaff).toBe(1);
      expect(report.summary.totalShifts).toBe(0);
      expect(report.summary.violationCount).toBe(0);
      expect(report.summary.complianceScore).toBe(100);
    });

    it('should detect weekly hours exceeded (>48h)', async () => {
      // 7 x 10h shifts Mon-Sun in same week bucket; Sun getDay()=0 → weekStart calc pushes to next Monday
      // So use Mon-Sat (6 shifts at 10h = 60h) to stay within one week bucket
      const shifts = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date('2026-03-02'); // Monday
        d.setDate(d.getDate() + i);
        shifts.push({
          date: d,
          status: 'PUBLISHED',
          shiftPattern: { name: 'Long', startTime: '06:00', endTime: '16:00', breakMinutes: 0 },
          location: null,
          assignments: [
            { userId: 'u1', user: { id: 'u1', firstName: 'Alice', lastName: 'Smith' } },
          ],
        });
      }
      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.userTenantMembership.findMany.mockResolvedValue([makeMember('u1', 'Alice', 'Smith')]);

      const report = await service.getComplianceReport(tenantId, '2026-03-01', '2026-03-08');

      expect(report.workingTimeViolations.weeklyHoursExceeded.length).toBeGreaterThan(0);
      expect(report.workingTimeViolations.weeklyHoursExceeded[0].userId).toBe('u1');
      expect(report.workingTimeViolations.weeklyHoursExceeded[0].hours).toBe(60);
    });

    it('should detect consecutive days exceeded (>6)', async () => {
      const shifts = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date('2026-03-02');
        d.setDate(d.getDate() + i);
        shifts.push({
          date: d,
          status: 'PUBLISHED',
          shiftPattern: { name: 'Short', startTime: '09:00', endTime: '13:00', breakMinutes: 0 },
          location: null,
          assignments: [
            { userId: 'u1', user: { id: 'u1', firstName: 'Alice', lastName: 'Smith' } },
          ],
        });
      }
      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.userTenantMembership.findMany.mockResolvedValue([makeMember('u1', 'Alice', 'Smith')]);

      const report = await service.getComplianceReport(tenantId, '2026-03-01', '2026-03-10');

      expect(report.workingTimeViolations.consecutiveDaysExceeded.length).toBeGreaterThan(0);
      expect(report.workingTimeViolations.consecutiveDaysExceeded[0].days).toBe(7);
    });

    it('should detect insufficient rest between shifts', async () => {
      // Late shift ending 23:00 followed by early shift starting 06:00 = 7h rest < 11h
      prisma.shift.findMany.mockResolvedValue([
        {
          date: new Date('2026-03-05'),
          status: 'PUBLISHED',
          shiftPattern: { name: 'Late', startTime: '15:00', endTime: '23:00', breakMinutes: 0 },
          location: null,
          assignments: [
            { userId: 'u1', user: { id: 'u1', firstName: 'Alice', lastName: 'Smith' } },
          ],
        },
        {
          date: new Date('2026-03-06'),
          status: 'PUBLISHED',
          shiftPattern: { name: 'Early', startTime: '06:00', endTime: '14:00', breakMinutes: 0 },
          location: null,
          assignments: [
            { userId: 'u1', user: { id: 'u1', firstName: 'Alice', lastName: 'Smith' } },
          ],
        },
      ]);
      prisma.userTenantMembership.findMany.mockResolvedValue([makeMember('u1', 'Alice', 'Smith')]);

      const report = await service.getComplianceReport(tenantId, '2026-03-01', '2026-03-10');

      expect(report.workingTimeViolations.insufficientRest.length).toBeGreaterThan(0);
      expect(report.workingTimeViolations.insufficientRest[0].restHours).toBeLessThan(11);
    });

    it('should calculate overtime hours correctly', async () => {
      // 1 week period, 6 shifts at 8h = 48h, standard = 37.5h, overtime = 10.5h
      const shifts = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date('2026-03-02');
        d.setDate(d.getDate() + i);
        shifts.push({
          date: d,
          status: 'PUBLISHED',
          shiftPattern: { name: 'Day', startTime: '07:00', endTime: '15:00', breakMinutes: 0 },
          location: null,
          assignments: [
            { userId: 'u1', user: { id: 'u1', firstName: 'Alice', lastName: 'Smith' } },
          ],
        });
      }
      prisma.shift.findMany.mockResolvedValue(shifts);
      prisma.userTenantMembership.findMany.mockResolvedValue([makeMember('u1', 'Alice', 'Smith')]);

      const report = await service.getComplianceReport(tenantId, '2026-03-02', '2026-03-09');

      expect(report.overtimeHours.length).toBe(1);
      expect(report.overtimeHours[0].scheduledHours).toBe(48);
      expect(report.overtimeHours[0].overtimeHours).toBeGreaterThan(0);
    });
  });
});
