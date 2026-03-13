import { NotFoundException } from '@nestjs/common';
import { CarePlansService } from '../src/modules/epr/care-plans/care-plans.service';

jest.mock('../src/modules/epr/care-plans/mappers/care-plan-fhir.mapper', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toFhirCarePlan: jest.fn((cp: any) => ({ id: cp.id, resourceType: 'CarePlan' })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toFhirCarePlanBundle: jest.fn((carePlans: any[], total: number) => ({
    total,
    entry: carePlans.map((cp: any) => ({ resource: { id: cp.id } })),
  })),
}));

describe('CarePlansService', () => {
  let service: CarePlansService;
  let prisma: {
    carePlan: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    carePlanGoal: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    carePlanActivity: {
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    carePlanNote: {
      findMany: jest.Mock;
      create: jest.Mock;
      count: jest.Mock;
    };
    patientEvent: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      carePlan: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      carePlanGoal: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      carePlanActivity: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      carePlanNote: {
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      patientEvent: { create: jest.fn() },
      auditLog: { create: jest.fn() },
      $transaction: jest.fn((cb: (tx: any) => Promise<unknown>) => cb(prisma)),
    };

    service = new CarePlansService(prisma as any);
  });

  // ── Create ──────────────────────────────────────────────

  describe('create', () => {
    it('should create care plan with event and audit log in transaction', async () => {
      const mockCreated = { id: 'cp1', title: 'Falls Prevention', patientId: 'p1' };
      prisma.carePlan.create.mockResolvedValue(mockCreated);
      prisma.patientEvent.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const dto = {
        title: 'Falls Prevention',
        category: 'NURSING',
        startDate: '2026-03-01',
        patientId: 'p1',
      };

      const result = await service.create(dto as any, 'user-1', 'tenant-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.carePlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Falls Prevention',
            patientId: 'p1',
            authorId: 'user-1',
            tenantId: 'tenant-1',
          }),
        }),
      );
      expect(prisma.patientEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          patientId: 'p1',
          eventType: 'CARE_PLAN_CREATED',
          tenantId: 'tenant-1',
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          resource: 'CarePlan',
          resourceId: 'cp1',
        }),
      });
      expect(result).toEqual({ id: 'cp1', resourceType: 'CarePlan' });
    });

    it('should create care plan with nested goals and activities', async () => {
      const mockCreated = { id: 'cp1', title: 'Test Plan' };
      prisma.carePlan.create.mockResolvedValue(mockCreated);
      prisma.patientEvent.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const dto = {
        title: 'Test Plan',
        startDate: '2026-03-01',
        patientId: 'p1',
        goals: [{ description: 'Reduce falls' }],
        activities: [{ type: 'EXERCISE', description: 'Daily walks' }],
      };

      await service.create(dto as any, 'user-1', 'tenant-1');

      const createCall = prisma.carePlan.create.mock.calls[0][0];
      expect(createCall.data.goals).toEqual({
        create: [expect.objectContaining({ description: 'Reduce falls' })],
      });
      expect(createCall.data.activities).toEqual({
        create: [expect.objectContaining({ type: 'EXERCISE', description: 'Daily walks' })],
      });
    });
  });

  // ── Search ──────────────────────────────────────────────

  describe('findAll', () => {
    it('should return paginated FHIR bundle with default pagination', async () => {
      const mockPlans = [{ id: 'cp1' }, { id: 'cp2' }];
      prisma.carePlan.findMany.mockResolvedValue(mockPlans);
      prisma.carePlan.count.mockResolvedValue(2);

      const result = await service.findAll({} as any, 'tenant-1');

      expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1' },
          skip: 0,
          take: 20,
        }),
      );
      expect(result).toEqual({
        total: 2,
        entry: [{ resource: { id: 'cp1' } }, { resource: { id: 'cp2' } }],
      });
    });

    it('should apply filters for patientId, status, and category', async () => {
      prisma.carePlan.findMany.mockResolvedValue([]);
      prisma.carePlan.count.mockResolvedValue(0);

      await service.findAll(
        { patientId: 'p1', status: 'ACTIVE', category: 'NURSING' } as any,
        'tenant-1',
      );

      expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: 'tenant-1',
            patientId: 'p1',
            status: 'ACTIVE',
            category: 'NURSING',
          },
        }),
      );
    });

    it('should handle custom pagination', async () => {
      prisma.carePlan.findMany.mockResolvedValue([]);
      prisma.carePlan.count.mockResolvedValue(0);

      await service.findAll({ page: 3, limit: 10 } as any, 'tenant-1');

      expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── Find One ────────────────────────────────────────────

  describe('findOne', () => {
    it('should return FHIR care plan when found', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });

      const result = await service.findOne('cp1', 'tenant-1');

      expect(result).toEqual({ id: 'cp1', resourceType: 'CarePlan' });
      expect(prisma.carePlan.findFirst).toHaveBeenCalledWith({
        where: { id: 'cp1', tenantId: 'tenant-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when care plan not found', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(null);

      await expect(service.findOne('cp1', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Update ──────────────────────────────────────────────

  describe('update', () => {
    it('should update care plan with event and audit log in transaction', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1', patientId: 'p1' });
      const mockUpdated = { id: 'cp1', title: 'Updated Plan' };
      prisma.carePlan.update.mockResolvedValue(mockUpdated);
      prisma.patientEvent.create.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.update(
        'cp1',
        { title: 'Updated Plan' } as any,
        'user-1',
        'tenant-1',
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.carePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cp1' },
          data: expect.objectContaining({ title: 'Updated Plan' }),
        }),
      );
      expect(prisma.patientEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'CARE_PLAN_UPDATED',
        }),
      });
      expect(result).toEqual({ id: 'cp1', resourceType: 'CarePlan' });
    });

    it('should throw NotFoundException when care plan not found for update', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(null);

      await expect(
        service.update('cp1', { title: 'X' } as any, 'user-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Goals ───────────────────────────────────────────────

  describe('addGoal', () => {
    it('should add goal to care plan with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      const mockGoal = { id: 'g1', description: 'Reduce falls' };
      prisma.carePlanGoal.create.mockResolvedValue(mockGoal);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.addGoal(
        'cp1',
        { description: 'Reduce falls' } as any,
        'user-1',
        'tenant-1',
      );

      expect(prisma.carePlanGoal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          carePlanId: 'cp1',
          description: 'Reduce falls',
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'CREATE',
          resource: 'CarePlanGoal',
          resourceId: 'g1',
        }),
      });
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException when care plan not found', async () => {
      prisma.carePlan.findFirst.mockResolvedValue(null);

      await expect(
        service.addGoal('cp1', { description: 'X' } as any, 'user-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGoal', () => {
    it('should update goal with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanGoal.findFirst.mockResolvedValue({ id: 'g1' });
      const mockGoal = { id: 'g1', status: 'ACTIVE' };
      prisma.carePlanGoal.update.mockResolvedValue(mockGoal);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateGoal(
        'cp1',
        'g1',
        { status: 'ACTIVE' } as any,
        'user-1',
        'tenant-1',
      );

      expect(prisma.carePlanGoal.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'g1' } }),
      );
      expect(result).toEqual(mockGoal);
    });

    it('should throw NotFoundException when goal not found', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanGoal.findFirst.mockResolvedValue(null);

      await expect(
        service.updateGoal('cp1', 'g1', {} as any, 'user-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeGoal', () => {
    it('should delete goal with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanGoal.findFirst.mockResolvedValue({ id: 'g1' });
      prisma.carePlanGoal.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await service.removeGoal('cp1', 'g1', 'user-1', 'tenant-1');

      expect(prisma.carePlanGoal.delete).toHaveBeenCalledWith({ where: { id: 'g1' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE',
          resource: 'CarePlanGoal',
        }),
      });
    });
  });

  // ── Activities ──────────────────────────────────────────

  describe('addActivity', () => {
    it('should add activity with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      const mockActivity = { id: 'a1', description: 'Daily walks' };
      prisma.carePlanActivity.create.mockResolvedValue(mockActivity);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.addActivity(
        'cp1',
        { type: 'EXERCISE', description: 'Daily walks' } as any,
        'user-1',
        'tenant-1',
      );

      expect(prisma.carePlanActivity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            carePlanId: 'cp1',
            type: 'EXERCISE',
            description: 'Daily walks',
          }),
        }),
      );
      expect(result).toEqual(mockActivity);
    });
  });

  describe('updateActivity', () => {
    it('should update activity with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanActivity.findFirst.mockResolvedValue({ id: 'a1' });
      const mockActivity = { id: 'a1', status: 'IN_PROGRESS' };
      prisma.carePlanActivity.update.mockResolvedValue(mockActivity);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.updateActivity(
        'cp1',
        'a1',
        { status: 'IN_PROGRESS' } as any,
        'user-1',
        'tenant-1',
      );

      expect(prisma.carePlanActivity.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' } }),
      );
      expect(result).toEqual(mockActivity);
    });

    it('should throw NotFoundException when activity not found', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanActivity.findFirst.mockResolvedValue(null);

      await expect(
        service.updateActivity('cp1', 'a1', {} as any, 'user-1', 'tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeActivity', () => {
    it('should delete activity with audit log', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanActivity.findFirst.mockResolvedValue({ id: 'a1' });
      prisma.carePlanActivity.delete.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      await service.removeActivity('cp1', 'a1', 'user-1', 'tenant-1');

      expect(prisma.carePlanActivity.delete).toHaveBeenCalledWith({ where: { id: 'a1' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DELETE',
          resource: 'CarePlanActivity',
        }),
      });
    });
  });

  // ── Notes ───────────────────────────────────────────────

  describe('addNote', () => {
    it('should add note to care plan', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      const mockNote = { id: 'n1', content: 'Patient improving' };
      prisma.carePlanNote.create.mockResolvedValue(mockNote);

      const result = await service.addNote(
        'cp1',
        { content: 'Patient improving' },
        'user-1',
        'tenant-1',
      );

      expect(prisma.carePlanNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            carePlanId: 'cp1',
            content: 'Patient improving',
            authorId: 'user-1',
          }),
        }),
      );
      expect(result).toEqual(mockNote);
    });
  });

  describe('getNotes', () => {
    it('should return paginated notes', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      const mockNotes = [{ id: 'n1' }, { id: 'n2' }];
      prisma.carePlanNote.findMany.mockResolvedValue(mockNotes);
      prisma.carePlanNote.count.mockResolvedValue(2);

      const result = await service.getNotes('cp1', 'tenant-1');

      expect(result).toEqual({ data: mockNotes, total: 2, page: 1, limit: 50 });
    });

    it('should handle custom pagination for notes', async () => {
      prisma.carePlan.findFirst.mockResolvedValue({ id: 'cp1' });
      prisma.carePlanNote.findMany.mockResolvedValue([]);
      prisma.carePlanNote.count.mockResolvedValue(0);

      await service.getNotes('cp1', 'tenant-1', { page: 2, limit: 10 });

      expect(prisma.carePlanNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });
});
