import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  toFhirPatient,
  type PatientWithRelations,
} from '../epr/patients/mappers/patient-fhir.mapper';
import {
  toFhirCarePlan,
  type CarePlanWithRelations,
} from '../epr/care-plans/mappers/care-plan-fhir.mapper';
import {
  toFhirMedicationRequest,
  type PrescriptionWithRelations,
} from '../epr/medications/mappers/medication-fhir.mapper';
import {
  toFhirAssessment,
  type AssessmentWithRelations,
} from '../epr/assessments/mappers/assessment-fhir.mapper';

// Relation includes replicated from each domain service so the FHIR mappers
// receive the shape they expect. Reads are transparently decrypted by the
// Prisma encryption middleware.
const PATIENT_INCLUDES = {
  identifiers: true,
  contacts: true,
  managingOrganization: true,
  gpPractitioner: true,
} as const;

const CARE_PLAN_INCLUDES = {
  patient: { select: { id: true, givenName: true, familyName: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
  goals: { orderBy: { createdAt: 'asc' as const } },
  activities: {
    orderBy: { createdAt: 'asc' as const },
    include: { assignee: { select: { id: true, givenName: true, familyName: true } } },
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    include: { author: { select: { id: true, firstName: true, lastName: true } } },
  },
} as const;

const PRESCRIPTION_INCLUDES = {
  medication: { select: { id: true, name: true, form: true, strength: true } },
  patient: { select: { id: true, givenName: true, familyName: true } },
  prescriber: { select: { id: true, firstName: true, lastName: true } },
  administrations: {
    orderBy: { occurredAt: 'desc' as const },
    include: { performer: { select: { id: true, firstName: true, lastName: true } } },
  },
} as const;

const ASSESSMENT_INCLUDES = {
  patient: { select: { id: true, givenName: true, familyName: true } },
  performedBy: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
} as const;

interface FhirEntryResource {
  resourceType: string;
  id?: string;
}

export interface PatientDsarExport {
  exportedAt: string;
  patientId: string;
  tenantId: string;
  /** Standards-based clinical core: Patient, CarePlans, MedicationRequests, Assessments. */
  fhir: {
    resourceType: 'Bundle';
    type: 'collection';
    total: number;
    entry: Array<{ fullUrl: string; resource: FhirEntryResource }>;
  };
  /** Domains without a standard FHIR representation, included as structured JSON. */
  encounters: unknown[];
  chcCases: unknown[];
  virtualWards: unknown[];
  timeline: unknown[];
}

/**
 * Assembles a complete export of one patient's personal data for a GDPR
 * right-of-access / data-portability (DSAR) request. Read-only.
 */
@Injectable()
export class PatientDsarExportService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async exportPatient(
    patientId: string,
    actorId: string,
    tenantId: string,
    exportedAt: Date,
  ): Promise<PatientDsarExport> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      include: PATIENT_INCLUDES,
    });
    if (!patient) {
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );
    }

    const [carePlans, prescriptions, assessments, encounters, chcCases, virtualWards, timeline] =
      await Promise.all([
        this.prisma.carePlan.findMany({ where: { patientId }, include: CARE_PLAN_INCLUDES }),
        this.prisma.medicationRequest.findMany({
          where: { patientId },
          include: PRESCRIPTION_INCLUDES,
        }),
        this.prisma.assessment.findMany({ where: { patientId }, include: ASSESSMENT_INCLUDES }),
        this.prisma.encounter.findMany({
          where: { patientId },
          include: {
            location: true,
            bed: true,
            transfers: true,
            dischargePlan: { include: { tasks: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.chcCase.findMany({
          where: { patientId },
          include: { domainScores: true, notes: true, panelMembers: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.virtualWardEnrolment.findMany({
          where: { patientId },
          include: {
            protocols: { include: { thresholds: true } },
            observations: true,
            alerts: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.patientEvent.findMany({
          where: { patientId },
          include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { occurredAt: 'desc' },
        }),
      ]);

    // ── FHIR collection bundle for the clinical core ─────────────────────
    const resources: FhirEntryResource[] = [
      toFhirPatient(patient as PatientWithRelations),
      ...carePlans.map((cp) => toFhirCarePlan(cp as CarePlanWithRelations)),
      ...prescriptions.map((rx) => toFhirMedicationRequest(rx as PrescriptionWithRelations)),
      ...assessments.map((a) => toFhirAssessment(a as AssessmentWithRelations)),
    ];

    const fhir: PatientDsarExport['fhir'] = {
      resourceType: 'Bundle',
      type: 'collection',
      total: resources.length,
      entry: resources.map((resource) => ({
        fullUrl: `${resource.resourceType}/${resource.id ?? ''}`,
        resource,
      })),
    };

    // ── Audit the access ─────────────────────────────────────────────────
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'EXPORT',
        resource: 'Patient',
        resourceId: patientId,
        tenantId,
        metadata: {
          carePlans: carePlans.length,
          prescriptions: prescriptions.length,
          assessments: assessments.length,
          encounters: encounters.length,
          chcCases: chcCases.length,
          virtualWards: virtualWards.length,
          timelineEvents: timeline.length,
        },
      },
    });

    return {
      exportedAt: exportedAt.toISOString(),
      patientId,
      tenantId,
      fhir,
      encounters,
      chcCases,
      virtualWards,
      timeline,
    };
  }
}
