import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PatientFlowService } from '../src/modules/patient-flow/patient-flow.service';

// ── Mock Prisma ──────────────────────────────────────

function createMockPrisma() {
  return {
    location: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    bed: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    encounter: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    patient: {
      findFirst: jest.fn(),
    },
    patientEvent: {
      create: jest.fn(),
    },
    dischargePlan: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dischargeTask: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockTx)),
  };
}

const mockTx = {
  dischargePlan: { update: jest.fn() },
  encounter: { update: jest.fn() },
  bed: { update: jest.fn() },
  patientEvent: { create: jest.fn() },
};

type MockPrisma = ReturnType<typeof createMockPrisma>;

function createMockEventsService() {
  return {
    emitSwapCreated: jest.fn(),
    emitSwapUpdated: jest.fn(),
    emitBedStatusChanged: jest.fn(),
    emitDischargePlanUpdated: jest.fn(),
  };
}

// ── Test data ──────────────────────────────────────────

const tenantId = 'tenant-1';

// ── Tests ──────────────────────────────────────────────

describe('PatientFlowService — Discharge Planning', () => {
  let service: PatientFlowService;
  let prisma: MockPrisma;
  let eventsService: ReturnType<typeof createMockEventsService>;

  beforeEach(() => {
    prisma = createMockPrisma();
    eventsService = createMockEventsService();
    // Reset transaction mocks
    mockTx.dischargePlan.update.mockReset();
    mockTx.encounter.update.mockReset();
    mockTx.bed.update.mockReset();
    mockTx.patientEvent.create.mockReset();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new PatientFlowService(prisma as any, eventsService as any, audit as any);
  });

  // ── createDischargePlan ───────────────────────────────

  describe('createDischargePlan', () => {
    it('should throw NotFoundException when no active encounter exists', async () => {
      prisma.encounter.findFirst.mockResolvedValue(null);

      await expect(
        service.createDischargePlan('enc-1', { notes: 'Test' } as any, 'user-1', tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when a plan already exists for the encounter', async () => {
      prisma.encounter.findFirst.mockResolvedValue({ id: 'enc-1', status: 'IN_PROGRESS' });
      prisma.dischargePlan.findUnique.mockResolvedValue({ id: 'plan-existing' });

      await expect(
        service.createDischargePlan('enc-1', { notes: 'Test' } as any, 'user-1', tenantId),
      ).rejects.toThrow('already exists');
    });

    it('should create a discharge plan for an active encounter', async () => {
      prisma.encounter.findFirst.mockResolvedValue({ id: 'enc-1', status: 'IN_PROGRESS' });
      prisma.dischargePlan.findUnique.mockResolvedValue(null);
      prisma.dischargePlan.create.mockResolvedValue({
        id: 'plan-1',
        encounterId: 'enc-1',
        status: 'DRAFT',
        notes: 'Discharge notes',
        tasks: [],
      });

      const result = await service.createDischargePlan(
        'enc-1',
        { notes: 'Discharge notes', plannedDate: '2026-03-20' } as any,
        'user-1',
        tenantId,
      );

      expect(result.id).toBe('plan-1');
      expect(prisma.dischargePlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encounterId: 'enc-1',
            createdById: 'user-1',
            tenantId,
          }),
        }),
      );
    });
  });

  // ── getDischargePlan ──────────────────────────────────

  describe('getDischargePlan', () => {
    it('should throw NotFoundException when no plan exists', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue(null);

      await expect(service.getDischargePlan('enc-1', tenantId)).rejects.toThrow(NotFoundException);
    });

    it('should return plan with tasks', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        encounterId: 'enc-1',
        tasks: [{ id: 'task-1', type: 'MEDICATION_REVIEW', status: 'PENDING' }],
        createdBy: { id: 'user-1', firstName: 'Dr', lastName: 'Smith' },
      });

      const result = await service.getDischargePlan('enc-1', tenantId);

      expect(result.id).toBe('plan-1');
      expect(result.tasks).toHaveLength(1);
    });

    it('should work with null tenantId (super admin)', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', tasks: [] });

      await service.getDischargePlan('enc-1', null);

      expect(prisma.dischargePlan.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { encounterId: 'enc-1' },
        }),
      );
    });
  });

  // ── addDischargeTask ──────────────────────────────────

  describe('addDischargeTask', () => {
    it('should throw NotFoundException when plan not found or completed', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue(null);

      await expect(
        service.addDischargeTask('enc-1', { type: 'MEDICATION_REVIEW' } as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create task and auto-update plan to IN_PROGRESS if DRAFT', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        status: 'DRAFT',
      });
      prisma.dischargeTask.create.mockResolvedValue({
        id: 'task-1',
        type: 'MEDICATION_REVIEW',
        status: 'PENDING',
      });

      const result = await service.addDischargeTask(
        'enc-1',
        { type: 'MEDICATION_REVIEW' } as any,
        tenantId,
      );

      expect(result.id).toBe('task-1');
      expect(prisma.dischargePlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('should not change plan status if already IN_PROGRESS', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({
        id: 'plan-1',
        status: 'IN_PROGRESS',
      });
      prisma.dischargeTask.create.mockResolvedValue({
        id: 'task-2',
        type: 'TRANSPORT',
        status: 'PENDING',
      });

      await service.addDischargeTask('enc-1', { type: 'TRANSPORT' } as any, tenantId);

      expect(prisma.dischargePlan.update).not.toHaveBeenCalled();
    });
  });

  // ── updateDischargeTask ───────────────────────────────

  describe('updateDischargeTask', () => {
    it('should throw NotFoundException when plan not found', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDischargeTask(
          'enc-1',
          'task-1',
          { status: 'COMPLETED' } as any,
          'user-1',
          tenantId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject updates on COMPLETED plan', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'COMPLETED' });

      await expect(
        service.updateDischargeTask(
          'enc-1',
          'task-1',
          { status: 'COMPLETED' } as any,
          'user-1',
          tenantId,
        ),
      ).rejects.toThrow('completed or cancelled');
    });

    it('should reject updates on CANCELLED plan', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'CANCELLED' });

      await expect(
        service.updateDischargeTask(
          'enc-1',
          'task-1',
          { status: 'COMPLETED' } as any,
          'user-1',
          tenantId,
        ),
      ).rejects.toThrow('completed or cancelled');
    });

    it('should throw NotFoundException when task not found', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });
      prisma.dischargeTask.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDischargeTask(
          'enc-1',
          'task-x',
          { status: 'COMPLETED' } as any,
          'user-1',
          tenantId,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update task status and set completedBy when COMPLETED', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });
      prisma.dischargeTask.findFirst.mockResolvedValue({ id: 'task-1', dischargePlanId: 'plan-1' });
      prisma.dischargeTask.update.mockResolvedValue({ id: 'task-1', status: 'COMPLETED' });
      prisma.dischargeTask.findMany.mockResolvedValue([{ status: 'COMPLETED' }]);

      await service.updateDischargeTask(
        'enc-1',
        'task-1',
        { status: 'COMPLETED' } as any,
        'user-1',
        tenantId,
      );

      expect(prisma.dischargeTask.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedBy: { connect: { id: 'user-1' } },
          }),
        }),
      );
    });

    it('should auto-set plan to READY when all tasks are completed', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });
      prisma.dischargeTask.findFirst.mockResolvedValue({ id: 'task-1', dischargePlanId: 'plan-1' });
      prisma.dischargeTask.update.mockResolvedValue({ id: 'task-1', status: 'COMPLETED' });
      // All tasks completed
      prisma.dischargeTask.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'COMPLETED' },
      ]);

      await service.updateDischargeTask(
        'enc-1',
        'task-1',
        { status: 'COMPLETED' } as any,
        'user-1',
        tenantId,
      );

      expect(prisma.dischargePlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: { status: 'READY' },
      });
    });

    it('should not set plan to READY when some tasks are still pending', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'IN_PROGRESS' });
      prisma.dischargeTask.findFirst.mockResolvedValue({ id: 'task-1', dischargePlanId: 'plan-1' });
      prisma.dischargeTask.update.mockResolvedValue({ id: 'task-1', status: 'COMPLETED' });
      prisma.dischargeTask.findMany.mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'PENDING' },
      ]);

      await service.updateDischargeTask(
        'enc-1',
        'task-1',
        { status: 'COMPLETED' } as any,
        'user-1',
        tenantId,
      );

      expect(prisma.dischargePlan.update).not.toHaveBeenCalled();
    });
  });

  // ── completeDischargePlan ─────────────────────────────

  describe('completeDischargePlan', () => {
    it('should throw NotFoundException when plan not found or not ready', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue(null);

      await expect(service.completeDischargePlan('enc-1', 'user-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when no active encounter', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'READY' });
      prisma.encounter.findFirst.mockResolvedValue(null);

      await expect(service.completeDischargePlan('enc-1', 'user-1', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should complete plan, discharge encounter, and free bed in transaction', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'READY' });
      prisma.encounter.findFirst.mockResolvedValue({
        id: 'enc-1',
        patientId: 'patient-1',
        bedId: 'bed-1',
        tenantId,
        status: 'IN_PROGRESS',
        patient: { givenName: 'John', familyName: 'Doe' },
      });
      mockTx.dischargePlan.update.mockResolvedValue({
        id: 'plan-1',
        status: 'COMPLETED',
        tasks: [],
      });

      const result = await service.completeDischargePlan('enc-1', 'user-1', tenantId);

      // Plan completed
      expect(mockTx.dischargePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            completedById: 'user-1',
          }),
        }),
      );

      // Encounter discharged
      expect(mockTx.encounter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'enc-1' },
          data: expect.objectContaining({
            status: 'FINISHED',
            dischargeDestination: 'HOME',
          }),
        }),
      );

      // Bed freed
      expect(mockTx.bed.update).toHaveBeenCalledWith({
        where: { id: 'bed-1' },
        data: { status: 'AVAILABLE' },
      });

      // Timeline event
      expect(mockTx.patientEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientId: 'patient-1',
            eventType: 'DISCHARGE',
            recordedById: 'user-1',
          }),
        }),
      );
    });

    it('should skip bed update when encounter has no bed', async () => {
      prisma.dischargePlan.findFirst.mockResolvedValue({ id: 'plan-1', status: 'READY' });
      prisma.encounter.findFirst.mockResolvedValue({
        id: 'enc-1',
        patientId: 'patient-1',
        bedId: null,
        tenantId,
        status: 'IN_PROGRESS',
        patient: { givenName: 'Jane', familyName: 'Doe' },
      });
      mockTx.dischargePlan.update.mockResolvedValue({
        id: 'plan-1',
        status: 'COMPLETED',
        tasks: [],
      });

      await service.completeDischargePlan('enc-1', 'user-1', tenantId);

      expect(mockTx.bed.update).not.toHaveBeenCalled();
    });
  });
});
