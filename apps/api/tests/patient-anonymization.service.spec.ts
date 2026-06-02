import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PatientAnonymizationService } from '../src/modules/privacy/patient-anonymization.service';

const PATIENT_ID = 'pat-1';
const TENANT = 'tenant-1';
const ACTOR = 'user-1';

type MockPrisma = {
  patient: { findFirst: jest.Mock; update: jest.Mock };
  carePlan: { findMany: jest.Mock };
  chcCase: { findMany: jest.Mock; updateMany: jest.Mock };
  virtualWardEnrolment: { findMany: jest.Mock; updateMany: jest.Mock };
  patientEvent: { updateMany: jest.Mock; create: jest.Mock };
  patientProcessingBasis: { updateMany: jest.Mock };
  patientConsent: { updateMany: jest.Mock };
  assessment: { updateMany: jest.Mock };
  medicationRequest: { updateMany: jest.Mock };
  medicationAdministration: { updateMany: jest.Mock };
  encounter: { updateMany: jest.Mock };
  carePlanNote: { updateMany: jest.Mock };
  carePlanGoal: { updateMany: jest.Mock };
  carePlanActivity: { updateMany: jest.Mock };
  chcDomainScore: { updateMany: jest.Mock };
  chcNote: { updateMany: jest.Mock };
  vitalObservation: { updateMany: jest.Mock };
  virtualWardAlert: { updateMany: jest.Mock };
  patientIdentifier: { deleteMany: jest.Mock };
  patientContact: { deleteMany: jest.Mock };
  patientSearchIndex: { deleteMany: jest.Mock };
  auditLog: { create: jest.Mock };
};

const buildPrisma = (overrides: Partial<Record<string, unknown>> = {}): MockPrisma => {
  const updateMany = () => ({ updateMany: jest.fn().mockResolvedValue({ count: 1 }) });
  const deleteMany = () => ({ deleteMany: jest.fn().mockResolvedValue({ count: 1 }) });
  return {
    patient: {
      findFirst: jest.fn().mockResolvedValue({
        id: PATIENT_ID,
        birthDate: new Date(Date.UTC(1980, 4, 15)),
        anonymizedAt: null,
      }),
      update: jest.fn().mockResolvedValue({ id: PATIENT_ID }),
    },
    carePlan: { findMany: jest.fn().mockResolvedValue([]) },
    chcCase: { findMany: jest.fn().mockResolvedValue([]), ...updateMany() },
    virtualWardEnrolment: { findMany: jest.fn().mockResolvedValue([]), ...updateMany() },
    patientEvent: { ...updateMany(), create: jest.fn().mockResolvedValue({}) },
    assessment: updateMany(),
    medicationRequest: updateMany(),
    medicationAdministration: updateMany(),
    encounter: updateMany(),
    carePlanNote: updateMany(),
    carePlanGoal: updateMany(),
    carePlanActivity: updateMany(),
    chcDomainScore: updateMany(),
    chcNote: updateMany(),
    vitalObservation: updateMany(),
    virtualWardAlert: updateMany(),
    patientProcessingBasis: updateMany(),
    patientConsent: updateMany(),
    patientIdentifier: deleteMany(),
    patientContact: deleteMany(),
    patientSearchIndex: deleteMany(),
    auditLog: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  } as MockPrisma;
};

describe('PatientAnonymizationService', () => {
  const build = (prisma: MockPrisma) => new PatientAnonymizationService(prisma as never);

  it('throws NotFound when the patient does not exist in the tenant', async () => {
    const prisma = buildPrisma();
    prisma.patient.findFirst.mockResolvedValue(null);
    const service = build(prisma);

    await expect(
      service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'reason', ACTOR, TENANT),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('throws BadRequest when the confirmation token does not match the id', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await expect(
      service.anonymisePatient(PATIENT_ID, 'wrong-id', 'reason', ACTOR, TENANT),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('throws Conflict when the patient is already anonymised', async () => {
    const prisma = buildPrisma();
    prisma.patient.findFirst.mockResolvedValue({
      id: PATIENT_ID,
      birthDate: new Date(Date.UTC(1980, 4, 15)),
      anonymizedAt: new Date(),
    });
    const service = build(prisma);

    await expect(
      service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'reason', ACTOR, TENANT),
    ).rejects.toThrow(ConflictException);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('redacts the patient, deletes identifiers and clears the search index', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    const result = await service.anonymisePatient(
      PATIENT_ID,
      PATIENT_ID,
      'DSAR 2026-06-02',
      ACTOR,
      TENANT,
    );

    // Patient row redacted with tombstones, generalised DOB, and erasure marker
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PATIENT_ID },
        data: expect.objectContaining({
          givenName: '[ERASED]',
          familyName: '[ERASED]',
          middleName: null,
          postalCode: null,
          postalCodeIndex: null,
          email: null,
          phone: null,
          userId: null,
          active: false,
          status: 'INACTIVE',
          gender: 'UNKNOWN',
          birthDate: new Date(Date.UTC(1980, 0, 1)),
          anonymizedById: ACTOR,
        }),
      }),
    );

    expect(prisma.patientIdentifier.deleteMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
    });
    expect(prisma.patientContact.deleteMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
    });
    expect(prisma.patientSearchIndex.deleteMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID },
    });

    expect(result.patientId).toBe(PATIENT_ID);
    expect(result.anonymizedAt).toBeInstanceOf(Date);
  });

  it('writes an ANONYMISE audit log capturing the reason', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'DSAR 2026-06-02', ACTOR, TENANT);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ACTOR,
        action: 'ANONYMISE',
        resource: 'Patient',
        resourceId: PATIENT_ID,
        tenantId: TENANT,
        metadata: { reason: 'DSAR 2026-06-02' },
      }),
    });
  });

  it('blanks direct patient-scoped clinical free-text', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'reason', ACTOR, TENANT);

    expect(prisma.assessment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: PATIENT_ID, tenantId: TENANT } }),
    );
    expect(prisma.encounter.updateMany).toHaveBeenCalledWith({
      where: { patientId: PATIENT_ID, tenantId: TENANT },
      data: { notes: '[ERASED]' },
    });
  });

  it('skips child-record redaction when the patient has no care plans / CHC / enrolments', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'reason', ACTOR, TENANT);

    expect(prisma.carePlanNote.updateMany).not.toHaveBeenCalled();
    expect(prisma.chcDomainScore.updateMany).not.toHaveBeenCalled();
    expect(prisma.vitalObservation.updateMany).not.toHaveBeenCalled();
  });

  it('redacts child records scoped by parent ids when they exist', async () => {
    const prisma = buildPrisma();
    prisma.carePlan.findMany.mockResolvedValue([{ id: 'cp1' }, { id: 'cp2' }]);
    prisma.virtualWardEnrolment.findMany.mockResolvedValue([{ id: 'vw1' }]);
    const service = build(prisma);

    await service.anonymisePatient(PATIENT_ID, PATIENT_ID, 'reason', ACTOR, TENANT);

    expect(prisma.carePlanNote.updateMany).toHaveBeenCalledWith({
      where: { carePlanId: { in: ['cp1', 'cp2'] } },
      data: { content: '[ERASED]' },
    });
    expect(prisma.vitalObservation.updateMany).toHaveBeenCalledWith({
      where: { enrolmentId: { in: ['vw1'] } },
      data: { notes: '[ERASED]' },
    });
  });
});
