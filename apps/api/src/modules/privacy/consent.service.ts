import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { ConsentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpsertProcessingBasisDto } from './dto/upsert-processing-basis.dto';
import { UpsertConsentDto } from './dto/upsert-consent.dto';

/**
 * Records the lawful basis under which a patient's data is processed (UK GDPR
 * Art. 6 / Art. 9, per purpose) and specific consents the patient has granted
 * or withdrawn. Backs the documented "controller must record the legal basis".
 */
@Injectable()
export class ConsentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ── Lawful basis (per processing purpose) ───────────────────────────────

  async listProcessingBases(patientId: string, tenantId: string) {
    await this.requirePatient(patientId, tenantId);
    return this.prisma.patientProcessingBasis.findMany({
      where: { patientId },
      orderBy: { purpose: 'asc' },
    });
  }

  async upsertProcessingBasis(
    patientId: string,
    dto: UpsertProcessingBasisDto,
    actorId: string,
    tenantId: string,
  ) {
    await this.requirePatient(patientId, tenantId);

    const basis = await this.prisma.patientProcessingBasis.upsert({
      where: { patientId_purpose: { patientId, purpose: dto.purpose } },
      create: {
        patientId,
        tenantId,
        purpose: dto.purpose,
        article6Basis: dto.article6Basis,
        article9Condition: dto.article9Condition ?? null,
        notes: dto.notes ?? null,
        recordedById: actorId,
      },
      update: {
        article6Basis: dto.article6Basis,
        article9Condition: dto.article9Condition ?? null,
        notes: dto.notes ?? null,
        recordedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'RECORD_PROCESSING_BASIS',
        resource: 'PatientProcessingBasis',
        resourceId: basis.id,
        tenantId,
        metadata: { patientId, purpose: dto.purpose, article6Basis: dto.article6Basis },
      },
    });

    return basis;
  }

  // ── Consents (per type, grant / withdraw) ───────────────────────────────

  async listConsents(patientId: string, tenantId: string) {
    await this.requirePatient(patientId, tenantId);
    return this.prisma.patientConsent.findMany({
      where: { patientId },
      orderBy: { type: 'asc' },
    });
  }

  async upsertConsent(patientId: string, dto: UpsertConsentDto, actorId: string, tenantId: string) {
    await this.requirePatient(patientId, tenantId);

    const granted = dto.status === ConsentStatus.GRANTED;
    const now = new Date();

    const consent = await this.prisma.patientConsent.upsert({
      where: { patientId_type: { patientId, type: dto.type } },
      create: {
        patientId,
        tenantId,
        type: dto.type,
        status: dto.status,
        grantedAt: granted ? now : null,
        withdrawnAt: granted ? null : now,
        notes: dto.notes ?? null,
        recordedById: actorId,
      },
      update: {
        status: dto.status,
        // Stamp the moment of the transition; leave the other timestamp intact.
        ...(granted ? { grantedAt: now, withdrawnAt: null } : { withdrawnAt: now }),
        notes: dto.notes ?? null,
        recordedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: granted ? 'GRANT_CONSENT' : 'WITHDRAW_CONSENT',
        resource: 'PatientConsent',
        resourceId: consent.id,
        tenantId,
        metadata: { patientId, type: dto.type, status: dto.status },
      },
    });

    return consent;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async requirePatient(patientId: string, tenantId: string): Promise<void> {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, tenantId },
      select: { id: true },
    });
    if (!patient) {
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );
    }
  }
}
