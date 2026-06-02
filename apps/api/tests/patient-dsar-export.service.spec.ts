import { NotFoundException } from '@nestjs/common';

// Stub the FHIR mappers so the test exercises orchestration, not mapper internals.
jest.mock('../src/modules/epr/patients/mappers/patient-fhir.mapper', () => ({
  toFhirPatient: (p: { id: string }) => ({ resourceType: 'Patient', id: p.id }),
}));
jest.mock('../src/modules/epr/care-plans/mappers/care-plan-fhir.mapper', () => ({
  toFhirCarePlan: (c: { id: string }) => ({ resourceType: 'CarePlan', id: c.id }),
}));
jest.mock('../src/modules/epr/medications/mappers/medication-fhir.mapper', () => ({
  toFhirMedicationRequest: (m: { id: string }) => ({ resourceType: 'MedicationRequest', id: m.id }),
}));
jest.mock('../src/modules/epr/assessments/mappers/assessment-fhir.mapper', () => ({
  toFhirAssessment: (a: { id: string }) => ({ resourceType: 'Observation', id: a.id }),
}));

// eslint-disable-next-line import/first
import { PatientDsarExportService } from '../src/modules/privacy/patient-dsar-export.service';

const PATIENT_ID = 'pat-1';
const TENANT = 'tenant-1';
const ACTOR = 'user-1';
const EXPORTED_AT = new Date('2026-06-02T00:00:00.000Z');

const buildPrisma = () => ({
  patient: { findFirst: jest.fn().mockResolvedValue({ id: PATIENT_ID }) },
  carePlan: { findMany: jest.fn().mockResolvedValue([{ id: 'cp1' }, { id: 'cp2' }]) },
  medicationRequest: { findMany: jest.fn().mockResolvedValue([{ id: 'rx1' }]) },
  assessment: { findMany: jest.fn().mockResolvedValue([{ id: 'as1' }]) },
  encounter: { findMany: jest.fn().mockResolvedValue([{ id: 'enc1' }]) },
  chcCase: { findMany: jest.fn().mockResolvedValue([{ id: 'chc1' }]) },
  virtualWardEnrolment: { findMany: jest.fn().mockResolvedValue([{ id: 'vw1' }]) },
  patientEvent: { findMany: jest.fn().mockResolvedValue([{ id: 'ev1' }, { id: 'ev2' }]) },
  patientProcessingBasis: { findMany: jest.fn().mockResolvedValue([{ id: 'pb1' }]) },
  patientConsent: { findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]) },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('PatientDsarExportService', () => {
  const build = (prisma: ReturnType<typeof buildPrisma>) =>
    new PatientDsarExportService(prisma as never);

  it('throws NotFound when the patient is not in the tenant', async () => {
    const prisma = buildPrisma();
    prisma.patient.findFirst.mockResolvedValue(null);
    const service = build(prisma);

    await expect(service.exportPatient(PATIENT_ID, ACTOR, TENANT, EXPORTED_AT)).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('assembles a FHIR collection bundle of the clinical core', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    const result = await service.exportPatient(PATIENT_ID, ACTOR, TENANT, EXPORTED_AT);

    expect(result.fhir.resourceType).toBe('Bundle');
    expect(result.fhir.type).toBe('collection');
    // 1 Patient + 2 CarePlans + 1 MedicationRequest + 1 Assessment
    expect(result.fhir.total).toBe(5);
    const types = result.fhir.entry.map((e) => e.resource.resourceType);
    expect(types).toEqual(['Patient', 'CarePlan', 'CarePlan', 'MedicationRequest', 'Observation']);
    expect(result.fhir.entry[0].fullUrl).toBe('Patient/pat-1');
  });

  it('includes the non-FHIR domains as structured JSON sections', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    const result = await service.exportPatient(PATIENT_ID, ACTOR, TENANT, EXPORTED_AT);

    expect(result.encounters).toEqual([{ id: 'enc1' }]);
    expect(result.chcCases).toEqual([{ id: 'chc1' }]);
    expect(result.virtualWards).toEqual([{ id: 'vw1' }]);
    expect(result.timeline).toEqual([{ id: 'ev1' }, { id: 'ev2' }]);
    expect(result.exportedAt).toBe('2026-06-02T00:00:00.000Z');
    expect(result.patientId).toBe(PATIENT_ID);
  });

  it('writes an EXPORT audit log with record counts', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.exportPatient(PATIENT_ID, ACTOR, TENANT, EXPORTED_AT);

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: ACTOR,
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: PATIENT_ID,
        tenantId: TENANT,
        metadata: expect.objectContaining({
          carePlans: 2,
          prescriptions: 1,
          assessments: 1,
          encounters: 1,
          chcCases: 1,
          virtualWards: 1,
          timelineEvents: 2,
        }),
      }),
    });
  });

  it('scopes every query to the patient', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    await service.exportPatient(PATIENT_ID, ACTOR, TENANT, EXPORTED_AT);

    expect(prisma.patient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PATIENT_ID, tenantId: TENANT } }),
    );
    expect(prisma.carePlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patientId: PATIENT_ID } }),
    );
  });
});
