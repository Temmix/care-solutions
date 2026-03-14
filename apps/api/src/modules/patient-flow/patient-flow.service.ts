import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, BedStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { AdmitPatientDto } from './dto/admit-patient.dto';
import { TransferDto } from './dto/transfer.dto';
import { DischargeDto } from './dto/discharge.dto';

@Injectable()
export class PatientFlowService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Locations ───────────────────────────────────────

  async createLocation(dto: CreateLocationDto, tenantId: string) {
    if (dto.parentId) {
      const parent = await this.prisma.location.findFirst({
        where: { id: dto.parentId, tenantId },
      });
      if (!parent)
        throw new NotFoundException(
          'Parent location not found. Please verify the parent location still exists.',
        );
    }

    return this.prisma.location.create({
      data: { ...dto, tenantId },
      include: { children: true, beds: true },
    });
  }

  async listLocations(tenantId: string | null) {
    const where: Prisma.LocationWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    return this.prisma.location.findMany({
      where,
      include: {
        children: true,
        beds: true,
        _count: { select: { beds: true, encounters: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async updateLocation(id: string, dto: UpdateLocationDto, tenantId: string | null) {
    const findWhere: Prisma.LocationWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.location.findFirst({ where: findWhere });
    if (!existing)
      throw new NotFoundException(
        'Location not found. It may have been deleted or belongs to another organisation.',
      );
    return this.prisma.location.update({
      where: { id },
      data: dto,
      include: { children: true, beds: true },
    });
  }

  // ── Beds ────────────────────────────────────────────

  async createBed(dto: CreateBedDto, tenantId: string) {
    const location = await this.prisma.location.findFirst({
      where: { id: dto.locationId, tenantId },
    });
    if (!location)
      throw new NotFoundException(
        'Location not found. It may have been deleted or belongs to another organisation.',
      );

    return this.prisma.bed.create({
      data: {
        identifier: dto.identifier,
        locationId: dto.locationId,
        notes: dto.notes,
        tenantId,
      },
      include: { location: true },
    });
  }

  async listBeds(tenantId: string | null, filters: { locationId?: string; status?: string }) {
    const where: Prisma.BedWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.status) where.status = filters.status as Prisma.EnumBedStatusFilter;

    return this.prisma.bed.findMany({
      where,
      include: { location: true },
      orderBy: { identifier: 'asc' },
    });
  }

  async updateBed(id: string, data: { status?: string; notes?: string }, tenantId: string | null) {
    const findWhere: Prisma.BedWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const existing = await this.prisma.bed.findFirst({ where: findWhere });
    if (!existing)
      throw new NotFoundException(
        'Bed not found. It may have been deleted or moved to a different location.',
      );

    const updateData: Prisma.BedUpdateInput = {};
    if (data.status) updateData.status = data.status as BedStatus;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return this.prisma.bed.update({
      where: { id },
      data: updateData,
      include: { location: true },
    });
  }

  // ── Encounters ──────────────────────────────────────

  async admit(dto: AdmitPatientDto, userId: string, tenantId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, tenantId },
    });
    if (!patient)
      throw new NotFoundException('Patient not found. Please verify the patient record exists.');

    // Check for active encounter
    const activeEncounter = await this.prisma.encounter.findFirst({
      where: {
        patientId: dto.patientId,
        tenantId,
        status: { in: ['PLANNED', 'ARRIVED', 'IN_PROGRESS'] },
      },
    });
    if (activeEncounter) {
      throw new BadRequestException(
        'This patient already has an active admission. Please discharge or transfer the current encounter before creating a new one.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.create({
        data: {
          patientId: dto.patientId,
          status: 'IN_PROGRESS',
          class: dto.class ?? 'INPATIENT',
          admissionSource: dto.admissionSource,
          locationId: dto.locationId,
          bedId: dto.bedId,
          primaryPractitionerId: dto.primaryPractitionerId,
          notes: dto.notes,
          tenantId,
        },
        include: {
          patient: { select: { id: true, givenName: true, familyName: true } },
          location: true,
          bed: true,
          primaryPractitioner: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Mark bed as occupied
      if (dto.bedId) {
        await tx.bed.update({
          where: { id: dto.bedId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Create timeline event
      await tx.patientEvent.create({
        data: {
          patientId: dto.patientId,
          eventType: 'ADMISSION',
          summary: `Patient admitted${encounter.location ? ` to ${encounter.location.name}` : ''}`,
          recordedById: userId,
          tenantId,
        },
      });

      return encounter;
    });
  }

  async listEncounters(
    tenantId: string | null,
    filters: { status?: string; patientId?: string; page?: number; limit?: number },
  ) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.EncounterWhereInput = {};
    if (tenantId) where.tenantId = tenantId;
    if (filters.status) where.status = filters.status as Prisma.EnumEncounterStatusFilter;
    if (filters.patientId) where.patientId = filters.patientId;

    const [encounters, total] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        include: {
          patient: { select: { id: true, givenName: true, familyName: true } },
          location: true,
          bed: true,
          primaryPractitioner: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { admissionDate: 'desc' },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data: encounters, total, page, limit };
  }

  async getEncounter(id: string, tenantId: string | null) {
    const findWhere: Prisma.EncounterWhereInput = { id };
    if (tenantId) findWhere.tenantId = tenantId;
    const encounter = await this.prisma.encounter.findFirst({
      where: findWhere,
      include: {
        patient: { select: { id: true, givenName: true, familyName: true } },
        location: true,
        bed: true,
        primaryPractitioner: { select: { id: true, firstName: true, lastName: true } },
        transfers: {
          include: {
            fromLocation: true,
            toLocation: true,
            fromBed: true,
            toBed: true,
            transferredBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { transferredAt: 'desc' },
        },
      },
    });
    if (!encounter)
      throw new NotFoundException(
        'Encounter not found. It may have been completed or belongs to another organisation.',
      );
    return encounter;
  }

  async transfer(encounterId: string, dto: TransferDto, userId: string, tenantId: string | null) {
    const encWhere: Prisma.EncounterWhereInput = { id: encounterId, status: 'IN_PROGRESS' };
    if (tenantId) encWhere.tenantId = tenantId;
    const encounter = await this.prisma.encounter.findFirst({
      where: encWhere,
      include: { patient: { select: { givenName: true, familyName: true } } },
    });
    if (!encounter)
      throw new NotFoundException(
        'No active encounter found for this patient. They may have already been discharged.',
      );

    const locWhere: Prisma.LocationWhereInput = { id: dto.toLocationId };
    if (tenantId) locWhere.tenantId = tenantId;
    const toLocation = await this.prisma.location.findFirst({
      where: locWhere,
    });
    if (!toLocation)
      throw new NotFoundException(
        'The selected destination location was not found. Please refresh and try again.',
      );

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          encounterId,
          fromLocationId: encounter.locationId,
          toLocationId: dto.toLocationId,
          fromBedId: encounter.bedId,
          toBedId: dto.toBedId,
          reason: dto.reason,
          transferredById: userId,
        },
      });

      // Free old bed
      if (encounter.bedId) {
        await tx.bed.update({
          where: { id: encounter.bedId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Occupy new bed
      if (dto.toBedId) {
        await tx.bed.update({
          where: { id: dto.toBedId },
          data: { status: 'OCCUPIED' },
        });
      }

      // Update encounter location
      await tx.encounter.update({
        where: { id: encounterId },
        data: { locationId: dto.toLocationId, bedId: dto.toBedId ?? null },
      });

      // Timeline event
      await tx.patientEvent.create({
        data: {
          patientId: encounter.patientId,
          eventType: 'TRANSFER',
          summary: `Patient transferred to ${toLocation.name}`,
          recordedById: userId,
          tenantId: encounter.tenantId,
        },
      });

      return transfer;
    });
  }

  async discharge(encounterId: string, dto: DischargeDto, userId: string, tenantId: string | null) {
    const encWhere: Prisma.EncounterWhereInput = { id: encounterId, status: 'IN_PROGRESS' };
    if (tenantId) encWhere.tenantId = tenantId;
    const encounter = await this.prisma.encounter.findFirst({
      where: encWhere,
      include: { patient: { select: { givenName: true, familyName: true } } },
    });
    if (!encounter)
      throw new NotFoundException(
        'No active encounter found for this patient. They may have already been discharged.',
      );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.encounter.update({
        where: { id: encounterId },
        data: {
          status: 'FINISHED',
          dischargeDate: new Date(),
          dischargeDestination: dto.destination,
          notes: dto.notes
            ? `${encounter.notes ?? ''}\nDischarge: ${dto.notes}`.trim()
            : encounter.notes,
        },
        include: {
          patient: { select: { id: true, givenName: true, familyName: true } },
          location: true,
          bed: true,
        },
      });

      // Free bed
      if (encounter.bedId) {
        await tx.bed.update({
          where: { id: encounter.bedId },
          data: { status: 'AVAILABLE' },
        });
      }

      // Timeline event
      await tx.patientEvent.create({
        data: {
          patientId: encounter.patientId,
          eventType: 'DISCHARGE',
          summary: `Patient discharged — destination: ${dto.destination.replace(/_/g, ' ').toLowerCase()}`,
          recordedById: userId,
          tenantId: encounter.tenantId,
        },
      });

      return updated;
    });
  }
}
