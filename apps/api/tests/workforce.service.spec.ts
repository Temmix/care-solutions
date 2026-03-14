import { NotFoundException, BadRequestException } from '@nestjs/common';
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

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new WorkforceService(prisma as any);
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
});
