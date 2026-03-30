import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TrainingService } from '../src/modules/training/training.service';

describe('TrainingService', () => {
  let service: TrainingService;
  let prisma: {
    userTenantMembership: { findFirst: jest.Mock };
    trainingRecord: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    trainingCertificate: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let audit: { log: jest.Mock };

  const tenantId = 'tenant-1';
  const userId = 'user-1';
  const createdById = 'admin-1';

  const mockRecord = {
    id: 'rec-1',
    title: 'Fire Safety Training',
    description: null,
    category: 'FIRE_SAFETY',
    priority: 'MANDATORY',
    status: 'SCHEDULED',
    provider: 'Safety Corp',
    scheduledDate: new Date('2026-04-01'),
    startedDate: null,
    completedDate: null,
    expiryDate: null,
    renewalPeriodMonths: 12,
    hoursCompleted: null,
    score: null,
    notes: null,
    userId,
    createdById,
    tenantId,
    user: { id: userId, firstName: 'Jane', lastName: 'Doe', role: 'NURSE' },
    createdBy: { id: createdById, firstName: 'Admin', lastName: 'User' },
    certificates: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCertificate = {
    id: 'cert-1',
    name: 'Fire Safety Certificate',
    issuer: 'Safety Corp',
    certificateNumber: 'FS-001',
    issueDate: new Date('2026-03-01'),
    expiryDate: new Date('2027-03-01'),
    trainingRecordId: 'rec-1',
    tenantId,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      userTenantMembership: { findFirst: jest.fn() },
      trainingRecord: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      trainingCertificate: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new TrainingService(
      prisma as any,
      audit as any,
      {
        notify: jest.fn().mockResolvedValue(undefined),
        notifyMany: jest.fn().mockResolvedValue(undefined),
      } as any,
    );
  });

  // ── createTrainingRecord ──────────────────────────────

  describe('createTrainingRecord', () => {
    const dto = {
      title: 'Fire Safety Training',
      category: 'FIRE_SAFETY' as const,
      priority: 'MANDATORY' as const,
      userId,
      provider: 'Safety Corp',
      renewalPeriodMonths: 12,
      scheduledDate: '2026-04-01',
    };

    it('should create a training record when user is an active member', async () => {
      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.trainingRecord.create.mockResolvedValue(mockRecord);

      const result = await service.createTrainingRecord(dto as any, createdById, tenantId);

      expect(prisma.userTenantMembership.findFirst).toHaveBeenCalledWith({
        where: { userId, organizationId: tenantId, status: 'ACTIVE' },
      });
      expect(prisma.trainingRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: dto.title,
          category: dto.category,
          userId,
          createdById,
          tenantId,
        }),
        include: expect.any(Object),
      });
      expect(result).toEqual(mockRecord);
    });

    it('should throw BadRequestException when user is not a tenant member', async () => {
      prisma.userTenantMembership.findFirst.mockResolvedValue(null);

      await expect(service.createTrainingRecord(dto as any, createdById, tenantId)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.trainingRecord.create).not.toHaveBeenCalled();
    });

    it('should fire audit log after creation', async () => {
      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.trainingRecord.create.mockResolvedValue(mockRecord);

      await service.createTrainingRecord(dto as any, createdById, tenantId);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          resource: 'TrainingRecord',
          resourceId: mockRecord.id,
          tenantId,
        }),
      );
    });
  });

  // ── listTrainingRecords ───────────────────────────────

  describe('listTrainingRecords', () => {
    it('should return paginated results with default pagination', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([mockRecord]);
      prisma.trainingRecord.count.mockResolvedValue(1);

      const result = await service.listTrainingRecords(tenantId);

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual({ data: [mockRecord], total: 1, page: 1, limit: 20 });
    });

    it('should apply filters', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([]);
      prisma.trainingRecord.count.mockResolvedValue(0);

      await service.listTrainingRecords(tenantId, {
        userId: 'user-2',
        status: 'COMPLETED' as any,
        category: 'FIRE_SAFETY' as any,
        priority: 'MANDATORY' as any,
      });

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            userId: 'user-2',
            status: 'COMPLETED',
            category: 'FIRE_SAFETY',
            priority: 'MANDATORY',
          }),
        }),
      );
    });

    it('should apply search filter with OR condition', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([]);
      prisma.trainingRecord.count.mockResolvedValue(0);

      await service.listTrainingRecords(tenantId, { search: 'fire' });

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'fire', mode: 'insensitive' } },
              { provider: { contains: 'fire', mode: 'insensitive' } },
              { description: { contains: 'fire', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should handle custom pagination', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([]);
      prisma.trainingRecord.count.mockResolvedValue(0);

      await service.listTrainingRecords(tenantId, { page: 3, limit: 10 });

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── getTrainingRecord ─────────────────────────────────

  describe('getTrainingRecord', () => {
    it('should return record when found', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);

      const result = await service.getTrainingRecord('rec-1', tenantId);

      expect(prisma.trainingRecord.findFirst).toHaveBeenCalledWith({
        where: { id: 'rec-1', tenantId },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockRecord);
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(null);

      await expect(service.getTrainingRecord('rec-999', tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── getMyTrainingRecords ──────────────────────────────

  describe('getMyTrainingRecords', () => {
    it('should return records for the given user', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([mockRecord]);

      const result = await service.getMyTrainingRecords(userId, tenantId);

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith({
        where: { userId, tenantId },
        include: expect.objectContaining({ certificates: true }),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockRecord]);
    });
  });

  // ── updateTrainingRecord ──────────────────────────────

  describe('updateTrainingRecord', () => {
    it('should update record fields', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);
      prisma.trainingRecord.update.mockResolvedValue({ ...mockRecord, title: 'Updated Title' });

      const result = await service.updateTrainingRecord(
        'rec-1',
        { title: 'Updated Title' } as any,
        tenantId,
      );

      expect(prisma.trainingRecord.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: expect.objectContaining({ title: 'Updated Title' }),
        include: expect.any(Object),
      });
      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when record does not exist', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTrainingRecord('rec-999', { title: 'X' } as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should auto-set status to COMPLETED when completedDate is provided', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue({
        ...mockRecord,
        status: 'IN_PROGRESS',
      });
      prisma.trainingRecord.update.mockResolvedValue({ ...mockRecord, status: 'COMPLETED' });

      await service.updateTrainingRecord('rec-1', { completedDate: '2026-03-25' } as any, tenantId);

      expect(prisma.trainingRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should auto-set status to IN_PROGRESS when startedDate is provided and status is SCHEDULED', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue({
        ...mockRecord,
        status: 'SCHEDULED',
      });
      prisma.trainingRecord.update.mockResolvedValue({ ...mockRecord, status: 'IN_PROGRESS' });

      await service.updateTrainingRecord('rec-1', { startedDate: '2026-03-20' } as any, tenantId);

      expect(prisma.trainingRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('should not auto-set status when explicit status is provided', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);
      prisma.trainingRecord.update.mockResolvedValue({ ...mockRecord, status: 'OVERDUE' });

      await service.updateTrainingRecord(
        'rec-1',
        { status: 'OVERDUE', completedDate: '2026-03-25' } as any,
        tenantId,
      );

      expect(prisma.trainingRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'OVERDUE' }),
        }),
      );
    });

    it('should fire audit log after update', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);
      prisma.trainingRecord.update.mockResolvedValue(mockRecord);

      await service.updateTrainingRecord('rec-1', { title: 'New' } as any, tenantId);

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'UPDATE',
          resource: 'TrainingRecord',
          resourceId: 'rec-1',
        }),
      );
    });
  });

  // ── deleteTrainingRecord ──────────────────────────────

  describe('deleteTrainingRecord', () => {
    it('should delete record and fire audit log', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);

      await service.deleteTrainingRecord('rec-1', createdById, tenantId);

      expect(prisma.trainingRecord.delete).toHaveBeenCalledWith({ where: { id: 'rec-1' } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          resource: 'TrainingRecord',
          resourceId: 'rec-1',
          metadata: { title: mockRecord.title },
        }),
      );
    });

    it('should throw NotFoundException when record does not exist', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(null);

      await expect(service.deleteTrainingRecord('rec-999', createdById, tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.trainingRecord.delete).not.toHaveBeenCalled();
    });
  });

  // ── addCertificate ────────────────────────────────────

  describe('addCertificate', () => {
    const certDto = {
      name: 'Fire Safety Certificate',
      issuer: 'Safety Corp',
      certificateNumber: 'FS-001',
      issueDate: '2026-03-01',
      expiryDate: '2027-03-01',
    };

    it('should add certificate to existing training record', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(mockRecord);
      prisma.trainingCertificate.create.mockResolvedValue(mockCertificate);

      const result = await service.addCertificate('rec-1', certDto as any, tenantId);

      expect(prisma.trainingCertificate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: certDto.name,
          issuer: certDto.issuer,
          trainingRecordId: 'rec-1',
          tenantId,
        }),
      });
      expect(result).toEqual(mockCertificate);
    });

    it('should throw NotFoundException when training record does not exist', async () => {
      prisma.trainingRecord.findFirst.mockResolvedValue(null);

      await expect(service.addCertificate('rec-999', certDto as any, tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.trainingCertificate.create).not.toHaveBeenCalled();
    });
  });

  // ── updateCertificate ─────────────────────────────────

  describe('updateCertificate', () => {
    it('should update certificate when found', async () => {
      prisma.trainingCertificate.findFirst.mockResolvedValue(mockCertificate);
      prisma.trainingCertificate.update.mockResolvedValue({
        ...mockCertificate,
        name: 'Updated Cert',
      });

      const result = await service.updateCertificate(
        'rec-1',
        'cert-1',
        { name: 'Updated Cert' } as any,
        tenantId,
      );

      expect(prisma.trainingCertificate.update).toHaveBeenCalledWith({
        where: { id: 'cert-1' },
        data: expect.objectContaining({ name: 'Updated Cert' }),
      });
      expect(result.name).toBe('Updated Cert');
    });

    it('should throw NotFoundException when certificate not found', async () => {
      prisma.trainingCertificate.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCertificate('rec-1', 'cert-999', { name: 'X' } as any, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteCertificate ─────────────────────────────────

  describe('deleteCertificate', () => {
    it('should delete certificate when found', async () => {
      prisma.trainingCertificate.findFirst.mockResolvedValue(mockCertificate);

      await service.deleteCertificate('rec-1', 'cert-1', tenantId);

      expect(prisma.trainingCertificate.delete).toHaveBeenCalledWith({ where: { id: 'cert-1' } });
    });

    it('should throw NotFoundException when certificate not found', async () => {
      prisma.trainingCertificate.findFirst.mockResolvedValue(null);

      await expect(service.deleteCertificate('rec-1', 'cert-999', tenantId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.trainingCertificate.delete).not.toHaveBeenCalled();
    });
  });

  // ── Notification tests ──────────────────────────────────

  describe('training assignment notification', () => {
    const dto = {
      title: 'Fire Safety Training',
      category: 'FIRE_SAFETY' as const,
      priority: 'MANDATORY' as const,
      userId,
      provider: 'Safety Corp',
      renewalPeriodMonths: 12,
      scheduledDate: '2026-04-01',
    };

    it('should notify assigned user when created by a different user', async () => {
      const notif = {
        notify: jest.fn().mockResolvedValue(undefined),
        notifyMany: jest.fn().mockResolvedValue(undefined),
      };
      const svc = new TrainingService(prisma as any, audit as any, notif as any);

      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.trainingRecord.create.mockResolvedValue(mockRecord);

      await svc.createTrainingRecord(dto as any, createdById, tenantId);

      expect(notif.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          tenantId,
          type: 'TRAINING_ASSIGNED',
          title: 'Training Assigned',
          message: expect.stringContaining('Fire Safety Training'),
        }),
      );
    });

    it('should not notify when user creates their own training record', async () => {
      const notif = {
        notify: jest.fn().mockResolvedValue(undefined),
        notifyMany: jest.fn().mockResolvedValue(undefined),
      };
      const svc = new TrainingService(prisma as any, audit as any, notif as any);

      prisma.userTenantMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.trainingRecord.create.mockResolvedValue(mockRecord);

      // createdById === userId (self-assignment)
      await svc.createTrainingRecord(dto as any, userId, tenantId);

      expect(notif.notify).not.toHaveBeenCalled();
    });
  });

  // ── getTrainingSummary ────────────────────────────────

  describe('getTrainingSummary', () => {
    it('should return summary with correct compliance percentage', async () => {
      const records = [
        { status: 'COMPLETED', category: 'FIRE_SAFETY', priority: 'MANDATORY' },
        { status: 'COMPLETED', category: 'FIRE_SAFETY', priority: 'MANDATORY' },
        { status: 'SCHEDULED', category: 'SAFEGUARDING', priority: 'MANDATORY' },
        { status: 'COMPLETED', category: 'COMMUNICATION', priority: 'OPTIONAL' },
      ];
      prisma.trainingRecord.findMany.mockResolvedValue(records);
      prisma.trainingRecord.count.mockResolvedValue(1);

      const result = await service.getTrainingSummary(tenantId);

      expect(result.totalRecords).toBe(4);
      expect(result.mandatoryTotal).toBe(3);
      expect(result.mandatoryCompleted).toBe(2);
      expect(result.compliancePercentage).toBe(67);
      expect(result.expiringCount).toBe(1);
      expect(result.byStatus).toEqual({ COMPLETED: 3, SCHEDULED: 1 });
      expect(result.byCategory).toEqual({ FIRE_SAFETY: 2, SAFEGUARDING: 1, COMMUNICATION: 1 });
    });

    it('should return 100% compliance when no mandatory records exist', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([
        { status: 'COMPLETED', category: 'OTHER', priority: 'OPTIONAL' },
      ]);
      prisma.trainingRecord.count.mockResolvedValue(0);

      const result = await service.getTrainingSummary(tenantId);

      expect(result.compliancePercentage).toBe(100);
      expect(result.mandatoryTotal).toBe(0);
    });
  });

  // ── getExpiringTraining ───────────────────────────────

  describe('getExpiringTraining', () => {
    it('should query records expiring within specified days', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([mockRecord]);

      const result = await service.getExpiringTraining(tenantId, 60);

      expect(prisma.trainingRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            expiryDate: expect.objectContaining({ lte: expect.any(Date), gte: expect.any(Date) }),
            status: { not: 'EXPIRED' },
          }),
          orderBy: { expiryDate: 'asc' },
        }),
      );
      expect(result).toEqual([mockRecord]);
    });

    it('should default to 30 days', async () => {
      prisma.trainingRecord.findMany.mockResolvedValue([]);

      await service.getExpiringTraining(tenantId);

      const callArgs = prisma.trainingRecord.findMany.mock.calls[0][0];
      const lteDate = callArgs.where.expiryDate.lte;
      const now = new Date();
      const diffDays = (lteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);
    });
  });
});
