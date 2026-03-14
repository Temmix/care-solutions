import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { CreateMedicationDto } from './dto/create-medication.dto';
import type { UpdateMedicationDto } from './dto/update-medication.dto';
import type { CreatePrescriptionDto } from './dto/create-prescription.dto';
import type { UpdatePrescriptionDto } from './dto/update-prescription.dto';
import type { CreateAdministrationDto } from './dto/create-administration.dto';
import type { SearchPrescriptionsDto } from './dto/search-prescriptions.dto';
import {
  toFhirMedicationRequest,
  toFhirMedicationRequestBundle,
  type PrescriptionWithRelations,
} from './mappers/medication-fhir.mapper';

const PRESCRIPTION_INCLUDES = {
  medication: { select: { id: true, name: true, form: true, strength: true } },
  patient: { select: { id: true, givenName: true, familyName: true } },
  prescriber: { select: { id: true, firstName: true, lastName: true } },
  administrations: {
    orderBy: { occurredAt: 'desc' as const },
    include: {
      performer: { select: { id: true, firstName: true, lastName: true } },
    },
  },
};

@Injectable()
export class MedicationsService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Medication Catalogue ──────────────────────────────

  async createMedication(dto: CreateMedicationDto, tenantId: string | null) {
    return this.prisma.medication.create({
      data: { ...dto, tenantId },
    });
  }

  async updateMedication(id: string, dto: UpdateMedicationDto, tenantId: string | null) {
    const existing = await this.prisma.medication.findFirst({
      where: { id, OR: [{ tenantId }, { tenantId: null }] },
    });
    if (!existing)
      throw new NotFoundException(
        'Medication not found. It may have been discontinued or belongs to another organisation.',
      );

    return this.prisma.medication.update({
      where: { id },
      data: dto,
    });
  }

  async findAllMedications(tenantId: string | null) {
    return this.prisma.medication.findMany({
      where: { OR: [{ tenantId }, { tenantId: null }], isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Prescriptions (MedicationRequest) ─────────────────

  async createPrescription(dto: CreatePrescriptionDto, userId: string, tenantId: string) {
    const { patientId, medicationId, startDate, endDate, ...rest } = dto;

    const prescription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medicationRequest.create({
        data: {
          ...rest,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : undefined,
          status: 'ACTIVE',
          patientId,
          medicationId,
          prescriberId: userId,
          tenantId,
        },
        include: PRESCRIPTION_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId,
          eventType: 'MEDICATION_PRESCRIBED',
          summary: `Medication prescribed: ${created.medication.name}`,
          detail: { prescriptionId: created.id } as unknown as Prisma.InputJsonValue,
          recordedById: userId,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'MedicationRequest',
          resourceId: created.id,
          tenantId,
        },
      });

      return created;
    });

    return toFhirMedicationRequest(prescription as PrescriptionWithRelations);
  }

  async findAllPrescriptions(dto: SearchPrescriptionsDto, tenantId: string | null) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicationRequestWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.medicationId) where.medicationId = dto.medicationId;
    if (dto.status) where.status = dto.status;

    const [prescriptions, total] = await Promise.all([
      this.prisma.medicationRequest.findMany({
        where,
        include: PRESCRIPTION_INCLUDES,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.medicationRequest.count({ where }),
    ]);

    return toFhirMedicationRequestBundle(prescriptions as PrescriptionWithRelations[], total);
  }

  async findOnePrescription(id: string, tenantId: string | null) {
    const where: Prisma.MedicationRequestWhereInput = { id };
    if (tenantId) where.tenantId = tenantId;
    const prescription = await this.prisma.medicationRequest.findFirst({
      where,
      include: PRESCRIPTION_INCLUDES,
    });

    if (!prescription)
      throw new NotFoundException(
        'Prescription not found. It may have been deleted or belongs to another organisation.',
      );

    return toFhirMedicationRequest(prescription as PrescriptionWithRelations);
  }

  async updatePrescription(
    id: string,
    dto: UpdatePrescriptionDto,
    userId: string,
    tenantId: string | null,
  ) {
    const findWhere: Prisma.MedicationRequestWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.medicationRequest.findFirst({
      where: findWhere,
    });
    if (!existing)
      throw new NotFoundException(
        'Prescription not found. It may have been deleted or belongs to another organisation.',
      );

    const { startDate, endDate, ...rest } = dto;

    const prescription = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.medicationRequest.update({
        where: { id },
        data: {
          ...rest,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
        include: PRESCRIPTION_INCLUDES,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'MedicationRequest',
          resourceId: id,
          tenantId: existing.tenantId,
        },
      });

      return updated;
    });

    return toFhirMedicationRequest(prescription as PrescriptionWithRelations);
  }

  // ── Administration ────────────────────────────────────

  async recordAdministration(
    dto: CreateAdministrationDto,
    userId: string,
    tenantId: string | null,
  ) {
    const reqWhere: Prisma.MedicationRequestWhereInput = { id: dto.requestId };
    if (tenantId) reqWhere.tenantId = tenantId;
    const request = await this.prisma.medicationRequest.findFirst({
      where: reqWhere,
      include: { medication: true },
    });
    if (!request)
      throw new NotFoundException(
        'Prescription not found. It may have been deleted or belongs to another organisation.',
      );

    const { requestId, occurredAt, ...rest } = dto;

    const resolvedTenantId = request.tenantId;

    const admin = await this.prisma.$transaction(async (tx) => {
      const created = await tx.medicationAdministration.create({
        data: {
          ...rest,
          occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
          requestId,
          medicationId: request.medicationId,
          patientId: request.patientId,
          performerId: userId,
          tenantId: resolvedTenantId,
        },
      });

      await tx.patientEvent.create({
        data: {
          patientId: request.patientId,
          eventType: 'MEDICATION_ADMINISTERED',
          summary: `Medication administered: ${request.medication.name}`,
          detail: {
            administrationId: created.id,
            prescriptionId: requestId,
          } as unknown as Prisma.InputJsonValue,
          recordedById: userId,
          tenantId: resolvedTenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'MedicationAdministration',
          resourceId: created.id,
          tenantId: resolvedTenantId,
        },
      });

      return created;
    });

    return admin;
  }

  async getAdministrations(
    requestId: string,
    tenantId: string | null,
    pagination?: { page?: number; limit?: number },
  ) {
    const reqWhere: Prisma.MedicationRequestWhereInput = { id: requestId };
    if (tenantId) reqWhere.tenantId = tenantId;
    const request = await this.prisma.medicationRequest.findFirst({
      where: reqWhere,
    });
    if (!request)
      throw new NotFoundException(
        'Prescription not found. It may have been deleted or belongs to another organisation.',
      );

    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [administrations, total] = await Promise.all([
      this.prisma.medicationAdministration.findMany({
        where: { requestId },
        include: {
          performer: { select: { id: true, firstName: true, lastName: true } },
          medication: { select: { id: true, name: true } },
        },
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.medicationAdministration.count({ where: { requestId } }),
    ]);

    return { data: administrations, total, page, limit };
  }
}
