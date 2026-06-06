import { NotFoundException } from '@nestjs/common';
import { ConsentService } from '../src/modules/privacy/consent.service';

const PATIENT_ID = 'pat-1';
const TENANT = 'tenant-1';
const ACTOR = 'user-1';

const buildPrisma = () => ({
  patient: { findFirst: jest.fn().mockResolvedValue({ id: PATIENT_ID }) },
  patientProcessingBasis: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({ id: 'pb1' }),
  },
  patientConsent: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest
      .fn()
      .mockImplementation(({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'c1', ...create }),
      ),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('ConsentService', () => {
  const build = (prisma: ReturnType<typeof buildPrisma>) => new ConsentService(prisma as never);

  it('throws NotFound when recording a basis for an unknown patient', async () => {
    const prisma = buildPrisma();
    prisma.patient.findFirst.mockResolvedValue(null);
    const service = build(prisma);

    await expect(
      service.upsertProcessingBasis(
        PATIENT_ID,
        { purpose: 'DIRECT_CARE', article6Basis: 'PUBLIC_TASK' } as never,
        ACTOR,
        TENANT,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.patientProcessingBasis.upsert).not.toHaveBeenCalled();
  });

  it('upserts a lawful basis keyed by patient + purpose and audits it', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.upsertProcessingBasis(
      PATIENT_ID,
      {
        purpose: 'DIRECT_CARE',
        article6Basis: 'PUBLIC_TASK',
        article9Condition: 'HEALTH_OR_SOCIAL_CARE',
      } as never,
      ACTOR,
      TENANT,
    );

    expect(prisma.patientProcessingBasis.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patientId_purpose: { patientId: PATIENT_ID, purpose: 'DIRECT_CARE' } },
        create: expect.objectContaining({
          patientId: PATIENT_ID,
          tenantId: TENANT,
          purpose: 'DIRECT_CARE',
          article6Basis: 'PUBLIC_TASK',
          article9Condition: 'HEALTH_OR_SOCIAL_CARE',
          recordedById: ACTOR,
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'RECORD_PROCESSING_BASIS', tenantId: TENANT }),
    });
  });

  it('stamps grantedAt and clears withdrawnAt when a consent is granted', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.upsertConsent(
      PATIENT_ID,
      { type: 'RESEARCH', status: 'GRANTED' } as never,
      ACTOR,
      TENANT,
    );

    const call = prisma.patientConsent.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ patientId_type: { patientId: PATIENT_ID, type: 'RESEARCH' } });
    expect(call.create.grantedAt).toBeInstanceOf(Date);
    expect(call.create.withdrawnAt).toBeNull();
    expect(call.update.grantedAt).toBeInstanceOf(Date);
    expect(call.update.withdrawnAt).toBeNull();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'GRANT_CONSENT' }),
    });
  });

  it('stamps withdrawnAt (not grantedAt) when a consent is withdrawn', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.upsertConsent(
      PATIENT_ID,
      { type: 'MARKETING', status: 'WITHDRAWN' } as never,
      ACTOR,
      TENANT,
    );

    const call = prisma.patientConsent.upsert.mock.calls[0][0];
    expect(call.update.withdrawnAt).toBeInstanceOf(Date);
    expect(call.update.grantedAt).toBeUndefined();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'WITHDRAW_CONSENT' }),
    });
  });

  it('lists bases and consents scoped to the patient', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.listProcessingBases(PATIENT_ID, TENANT);
    await service.listConsents(PATIENT_ID, TENANT);

    expect(prisma.patientProcessingBasis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: PATIENT_ID } }),
    );
    expect(prisma.patientConsent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: PATIENT_ID } }),
    );
  });
});
