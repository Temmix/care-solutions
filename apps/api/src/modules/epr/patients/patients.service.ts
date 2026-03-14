import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SubscriptionLimitService } from '../../billing/subscription-limit.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { BlindIndexService } from '../../encryption/blind-index.service';
import { PatientSearchService } from '../../encryption/patient-search.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { SearchPatientDto } from './dto/search-patient.dto';
import { CreatePatientEventDto } from './dto/create-patient-event.dto';
import {
  toFhirPatient,
  toFhirPatientBundle,
  type PatientWithRelations,
} from './mappers/patient-fhir.mapper';

const PATIENT_INCLUDES = {
  identifiers: true,
  contacts: true,
  managingOrganization: true,
  gpPractitioner: true,
} as const;

@Injectable()
export class PatientsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(SubscriptionLimitService) private limits: SubscriptionLimitService,
    @Inject(EncryptionService) private encryption: EncryptionService,
    @Inject(BlindIndexService) private blindIndex: BlindIndexService,
    @Inject(PatientSearchService) private patientSearch: PatientSearchService,
  ) {}

  async create(dto: CreatePatientDto, recordedById: string, tenantId: string) {
    await this.limits.enforcePatientLimit(tenantId);

    const { nhsNumber, mrn, contacts, birthDate, ...patientData } = dto;

    const identifiers: Prisma.PatientIdentifierCreateWithoutPatientInput[] = [];
    if (nhsNumber) {
      identifiers.push({
        type: 'NHS_NUMBER',
        system: 'https://fhir.nhs.uk/Id/nhs-number',
        value: nhsNumber,
        isPrimary: true,
      });
    }
    if (mrn) {
      identifiers.push({
        type: 'MRN',
        system: 'urn:oid:local-mrn',
        value: mrn,
        isPrimary: !nhsNumber,
      });
    }

    const patient = await this.prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          ...patientData,
          birthDate: new Date(birthDate),
          tenantId,
          identifiers: identifiers.length ? { create: identifiers } : undefined,
          contacts: contacts?.length ? { create: contacts } : undefined,
        },
        include: PATIENT_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId: created.id,
          eventType: 'CREATED',
          summary: `Patient record created for ${created.givenName} ${created.familyName}`,
          recordedById,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: recordedById,
          action: 'CREATE',
          resource: 'Patient',
          resourceId: created.id,
          tenantId,
        },
      });

      return created;
    });

    return toFhirPatient(patient as PatientWithRelations);
  }

  async search(dto: SearchPatientDto, tenantId: string | null) {
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;
    const encrypted = this.encryption.isEnabled();

    const where: Prisma.PatientWhereInput = { active: true };

    // Scope to tenant (SUPER_ADMIN with no tenantId sees all)
    if (tenantId) {
      where.tenantId = tenantId;
    }

    // Collect ID filters from blind index searches (intersected at the end)
    let idFilter: Set<string> | null = null;

    if (dto.name) {
      if (encrypted && tenantId) {
        const ids = await this.patientSearch.searchByName(dto.name, tenantId);
        idFilter = new Set(ids);
      } else {
        where.OR = [
          { givenName: { contains: dto.name, mode: 'insensitive' } },
          { familyName: { contains: dto.name, mode: 'insensitive' } },
        ];
      }
    }

    if (dto.nhsNumber) {
      if (encrypted && tenantId) {
        const hash = await this.blindIndex.computeBlindIndex(dto.nhsNumber, tenantId, 'value');
        where.identifiers = {
          some: { type: 'NHS_NUMBER', valueIndex: hash },
        };
      } else {
        where.identifiers = {
          some: { type: 'NHS_NUMBER', value: dto.nhsNumber },
        };
      }
    }

    if (dto.birthDate) {
      where.birthDate = new Date(dto.birthDate);
    }

    if (dto.excludeAdmitted === 'true') {
      where.encounters = {
        none: { status: { in: ['PLANNED', 'ARRIVED', 'IN_PROGRESS'] } },
      };
    }

    if (dto.postalCode) {
      if (encrypted && tenantId) {
        const ids = await this.patientSearch.searchByPostalCode(dto.postalCode, tenantId);
        const postalSet = new Set(ids);
        idFilter = idFilter ? new Set([...idFilter].filter((id) => postalSet.has(id))) : postalSet;
      } else {
        where.postalCode = { contains: dto.postalCode, mode: 'insensitive' };
      }
    }

    // Apply collected ID filter
    if (idFilter !== null) {
      if (idFilter.size === 0) {
        return toFhirPatientBundle([], 0);
      }
      where.id = { in: Array.from(idFilter) };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        include: PATIENT_INCLUDES,
        skip,
        take: limit,
        orderBy: encrypted ? { createdAt: 'desc' } : { familyName: 'asc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return toFhirPatientBundle(patients as PatientWithRelations[], total);
  }

  async findOne(id: string, tenantId: string | null, userId?: string, userRole?: string) {
    const where: Prisma.PatientWhereInput = { id };
    if (tenantId) where.tenantId = tenantId;

    const patient = await this.prisma.patient.findFirst({
      where,
      include: PATIENT_INCLUDES,
    });

    if (!patient)
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );

    if (userRole === 'PATIENT' && patient.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this patient record. You can only access your own information.',
      );
    }

    return toFhirPatient(patient as PatientWithRelations);
  }

  async update(id: string, dto: UpdatePatientDto, recordedById: string, tenantId: string) {
    const existing = await this.prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing)
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );

    const { birthDate, ...rest } = dto;
    const data: Prisma.PatientUpdateInput = { ...rest };
    if (birthDate) data.birthDate = new Date(birthDate);

    const patient = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id },
        data,
        include: PATIENT_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId: id,
          eventType: 'DEMOGRAPHIC_CHANGE',
          summary: 'Patient demographics updated',
          detail: dto as unknown as Prisma.InputJsonValue,
          recordedById,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: recordedById,
          action: 'UPDATE',
          resource: 'Patient',
          resourceId: id,
          tenantId,
        },
      });

      return updated;
    });

    return toFhirPatient(patient as PatientWithRelations);
  }

  async deactivate(id: string, recordedById: string, tenantId: string) {
    const existing = await this.prisma.patient.findFirst({ where: { id, tenantId } });
    if (!existing)
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );

    await this.prisma.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id },
        data: { active: false, status: 'INACTIVE' },
      });

      await tx.patientEvent.create({
        data: {
          patientId: id,
          eventType: 'UPDATED',
          summary: 'Patient record deactivated',
          recordedById,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: recordedById,
          action: 'DEACTIVATE',
          resource: 'Patient',
          resourceId: id,
          tenantId,
        },
      });
    });
  }

  async getTimeline(
    id: string,
    tenantId: string | null,
    filters: { eventType?: string; careSetting?: string; page?: number; limit?: number },
  ) {
    const patientWhere: Prisma.PatientWhereInput = { id };
    if (tenantId) patientWhere.tenantId = tenantId;

    const existing = await this.prisma.patient.findFirst({ where: patientWhere });
    if (!existing)
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientEventWhereInput = { patientId: id };
    if (filters.eventType) {
      where.eventType = filters.eventType as Prisma.EnumPatientEventTypeFilter;
    }
    if (filters.careSetting) {
      where.careSetting = filters.careSetting;
    }

    const [events, total] = await Promise.all([
      this.prisma.patientEvent.findMany({
        where,
        include: {
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.patientEvent.count({ where }),
    ]);

    return {
      data: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        summary: e.summary,
        detail: e.detail as Record<string, unknown> | null,
        careSetting: e.careSetting,
        occurredAt: e.occurredAt.toISOString(),
        recordedBy: e.recordedBy,
      })),
      total,
      page,
      limit,
    };
  }

  async addEvent(
    patientId: string,
    dto: CreatePatientEventDto,
    recordedById: string,
    tenantId: string,
  ) {
    const existing = await this.prisma.patient.findFirst({ where: { id: patientId, tenantId } });
    if (!existing)
      throw new NotFoundException(
        'Patient not found. They may have been removed or belong to another organisation.',
      );

    const event = await this.prisma.patientEvent.create({
      data: {
        patientId,
        eventType: dto.eventType,
        summary: dto.summary,
        detail: dto.detail as Prisma.InputJsonValue | undefined,
        careSetting: dto.careSetting,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        recordedById,
        tenantId,
      },
      include: {
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: recordedById,
        action: 'CREATE',
        resource: 'PatientEvent',
        resourceId: event.id,
        tenantId,
      },
    });

    return {
      id: event.id,
      eventType: event.eventType,
      summary: event.summary,
      detail: event.detail,
      careSetting: event.careSetting,
      occurredAt: event.occurredAt.toISOString(),
      recordedBy: event.recordedBy,
    };
  }
}
