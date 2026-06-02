import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/** Marker written over redacted free-text fields. Carries no PII. */
const TOMBSTONE = '[ERASED]';
const TOMBSTONE_JSON: Prisma.InputJsonValue = { erased: true };

export interface AnonymisationResult {
  patientId: string;
  anonymizedAt: Date;
}

/**
 * Irreversibly anonymises a patient (GDPR right to erasure / Art. 17).
 *
 * Strategy (per product decision): ANONYMISE, do not hard-delete — strip every
 * direct identifier and blank all free-text clinical notes, but keep the
 * de-identified structured clinical record (required under NHS records
 * retention + GDPR Art. 17(3) exemptions).
 *
 * NOT run inside a $transaction on purpose: the encryption middleware rebuilds
 * Patient name n-gram indexes after an update, and inside a transaction that
 * rebuild is deferred via setImmediate (it can't see the uncommitted row),
 * which would resurrect index rows after we delete them. Running sequentially
 * keeps ordering deterministic. The operation is monotonic and idempotent, so a
 * partial failure is safe to re-run.
 */
@Injectable()
export class PatientAnonymizationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async anonymisePatient(
    patientId: string,
    confirmation: string,
    reason: string,
    actorId: string,
    tenantId: string,
  ): Promise<AnonymisationResult> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true, birthDate: true, anonymizedAt: true },
    });
    if (!patient) {
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );
    }

    if (confirmation !== patientId) {
      throw new BadRequestException('Confirmation does not match the patient id. Erasure aborted.');
    }

    if (patient.anonymizedAt) {
      throw new ConflictException('Patient has already been anonymised.');
    }

    // ── Collect child record ids for parent-scoped redaction ──────────────
    const [carePlans, chcCases, enrolments] = await Promise.all([
      this.prisma.carePlan.findMany({ where: { patientId }, select: { id: true } }),
      this.prisma.chcCase.findMany({ where: { patientId }, select: { id: true } }),
      this.prisma.virtualWardEnrolment.findMany({ where: { patientId }, select: { id: true } }),
    ]);
    const carePlanIds = carePlans.map((c) => c.id);
    const chcCaseIds = chcCases.map((c) => c.id);
    const enrolmentIds = enrolments.map((e) => e.id);

    // ── Blank free-text on patient-scoped (direct-tenant) records ─────────
    const scope = { patientId, tenantId };
    await this.prisma.patientEvent.updateMany({
      where: scope,
      data: { summary: TOMBSTONE, detail: TOMBSTONE_JSON },
    });
    await this.prisma.assessment.updateMany({
      where: scope,
      data: {
        notes: TOMBSTONE,
        responses: TOMBSTONE_JSON,
        recommendedActions: TOMBSTONE,
        scoreInterpretation: TOMBSTONE,
      },
    });
    await this.prisma.medicationRequest.updateMany({
      where: scope,
      data: { dosageText: TOMBSTONE, reasonText: TOMBSTONE, instructions: TOMBSTONE },
    });
    await this.prisma.medicationAdministration.updateMany({
      where: scope,
      data: { notes: TOMBSTONE, notGivenReason: TOMBSTONE },
    });
    await this.prisma.encounter.updateMany({ where: scope, data: { notes: TOMBSTONE } });
    await this.prisma.chcCase.updateMany({
      where: scope,
      data: { referralReason: TOMBSTONE, screeningNotes: TOMBSTONE, decisionNotes: TOMBSTONE },
    });
    await this.prisma.virtualWardEnrolment.updateMany({
      where: scope,
      data: { clinicalSummary: TOMBSTONE, dischargeReason: TOMBSTONE },
    });

    // ── Blank free-text on child records (scoped via parent ids) ──────────
    if (carePlanIds.length) {
      const carePlanScope = { carePlanId: { in: carePlanIds } };
      await this.prisma.carePlanNote.updateMany({
        where: carePlanScope,
        data: { content: TOMBSTONE },
      });
      await this.prisma.carePlanGoal.updateMany({
        where: carePlanScope,
        data: { description: TOMBSTONE, notes: TOMBSTONE },
      });
      await this.prisma.carePlanActivity.updateMany({
        where: carePlanScope,
        data: { description: TOMBSTONE, notes: TOMBSTONE },
      });
    }
    if (chcCaseIds.length) {
      const chcScope = { chcCaseId: { in: chcCaseIds } };
      await this.prisma.chcDomainScore.updateMany({
        where: chcScope,
        data: { evidence: TOMBSTONE, notes: TOMBSTONE },
      });
      await this.prisma.chcNote.updateMany({ where: chcScope, data: { content: TOMBSTONE } });
    }
    if (enrolmentIds.length) {
      const enrolmentScope = { enrolmentId: { in: enrolmentIds } };
      await this.prisma.vitalObservation.updateMany({
        where: enrolmentScope,
        data: { notes: TOMBSTONE },
      });
      await this.prisma.virtualWardAlert.updateMany({
        where: enrolmentScope,
        data: { message: TOMBSTONE, resolveNotes: TOMBSTONE },
      });
    }

    // ── Delete pure-identifier rows (no clinical value once anonymised) ───
    await this.prisma.patientIdentifier.deleteMany({ where: { patientId } });
    await this.prisma.patientContact.deleteMany({ where: { patientId } });

    // ── Redact the Patient row itself ────────────────────────────────────
    // birthDate is generalised to the year only (Jan 1) to keep age-band
    // clinical utility while removing the exact date of birth.
    const birthYearOnly = new Date(Date.UTC(patient.birthDate.getUTCFullYear(), 0, 1));
    const anonymizedAt = new Date();

    await this.prisma.patient.update({
      where: { id: patientId },
      data: {
        givenName: TOMBSTONE,
        middleName: null,
        familyName: TOMBSTONE,
        prefix: null,
        gender: 'UNKNOWN',
        birthDate: birthYearOnly,
        deceasedDate: null,
        addressLine1: null,
        addressLine2: null,
        city: null,
        district: null,
        postalCode: null,
        postalCodeIndex: null,
        phone: null,
        email: null,
        maritalStatus: null,
        userId: null,
        active: false,
        status: 'INACTIVE',
        anonymizedAt,
        anonymizedById: actorId,
      },
    });

    // Remove the patient's name search index rows (the update above will have
    // regenerated them for the tombstone — clear them last).
    await this.prisma.patientSearchIndex.deleteMany({ where: { patientId } });

    // ── Record the erasure (audit trail is intentionally retained) ───────
    await this.prisma.patientEvent.create({
      data: {
        patientId,
        eventType: 'UPDATED',
        summary: 'Patient record anonymised (GDPR erasure)',
        recordedById: actorId,
        tenantId,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'ANONYMISE',
        resource: 'Patient',
        resourceId: patientId,
        tenantId,
        metadata: { reason },
      },
    });

    return { patientId, anonymizedAt };
  }
}
