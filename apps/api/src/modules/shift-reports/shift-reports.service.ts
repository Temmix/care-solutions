import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, PatientEventType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { APP_TIMEZONE } from '../workforce/shift-time';
import { reportingWindowClosesAt } from './reporting-window';
import { CreateShiftReportDto, ListShiftReportsDto } from './dto';

const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'TENANT_ADMIN'];

/** A patient the worker may report on, with the bed/encounter context. */
interface AllowedPatient {
  patientId: string;
  encounterId: string | null;
  bedId: string | null;
}

@Injectable()
export class ShiftReportsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  // ── Helpers ─────────────────────────────────────────

  private async getOrgTimezone(tenantId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { timezone: true },
    });
    return org?.timezone || APP_TIMEZONE;
  }

  /** Effective time of a report — device capture time if given, else now. */
  private resolveCapturedAt(capturedAt: string | undefined, serverNow: Date): Date {
    if (!capturedAt) return serverNow;
    const captured = new Date(capturedAt);
    if (Number.isNaN(captured.getTime())) return serverNow;
    if (captured.getTime() > serverNow.getTime() + 5 * 60_000) {
      throw new BadRequestException('Captured time cannot be in the future.');
    }
    return captured;
  }

  /** IDs of a location and all its descendants (within the tenant). */
  private async getLocationSubtreeIds(rootId: string, tenantId: string): Promise<string[]> {
    const all = await this.prisma.location.findMany({
      where: { tenantId },
      select: { id: true, parentId: true },
    });
    const childrenByParent = new Map<string, string[]>();
    for (const loc of all) {
      if (!loc.parentId) continue;
      const list = childrenByParent.get(loc.parentId) ?? [];
      list.push(loc.id);
      childrenByParent.set(loc.parentId, list);
    }
    const result: string[] = [];
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (result.includes(id)) continue;
      result.push(id);
      for (const child of childrenByParent.get(id) ?? []) queue.push(child);
    }
    return result;
  }

  /**
   * Patients a worker rostered to `locationId` may report on:
   * (a) active inpatient encounters in the location subtree (ward → bed → patient), and
   * (b) community patients whose home location is in the subtree.
   * Encounter context wins (gives a bed) when a patient appears in both.
   */
  private async allowedPatientsForShift(
    locationId: string,
    tenantId: string,
  ): Promise<Map<string, AllowedPatient>> {
    const locIds = await this.getLocationSubtreeIds(locationId, tenantId);
    const map = new Map<string, AllowedPatient>();

    const encounters = await this.prisma.encounter.findMany({
      where: { tenantId, status: 'IN_PROGRESS', locationId: { in: locIds } },
      select: { id: true, patientId: true, bedId: true },
    });
    for (const e of encounters) {
      map.set(e.patientId, { patientId: e.patientId, encounterId: e.id, bedId: e.bedId });
    }

    const homePatients = await this.prisma.patient.findMany({
      where: { tenantId, status: 'ACTIVE', locationId: { in: locIds } },
      select: { id: true },
    });
    for (const p of homePatients) {
      if (!map.has(p.id)) map.set(p.id, { patientId: p.id, encounterId: null, bedId: null });
    }

    return map;
  }

  // ── Create ──────────────────────────────────────────

  async createShiftReport(dto: CreateShiftReportDto, userId: string, tenantId: string) {
    // Idempotent replay (offline queue).
    if (dto.clientEventId) {
      const existing = await this.prisma.shiftReport.findUnique({
        where: { clientEventId: dto.clientEventId },
      });
      if (existing) {
        if (existing.recordedById !== userId) {
          throw new ForbiddenException('Report does not belong to you');
        }
        return existing;
      }
    }

    const assignment = await this.prisma.shiftAssignment.findUnique({
      where: { id: dto.shiftAssignmentId },
      include: {
        shift: { include: { shiftPattern: true, location: true } },
        clockRecord: true,
      },
    });
    if (!assignment) throw new NotFoundException('Shift assignment not found');
    if (assignment.userId !== userId) throw new ForbiddenException('Not your shift');
    if (assignment.shift.tenantId !== tenantId) throw new ForbiddenException('Tenant mismatch');
    if (!assignment.clockRecord) {
      throw new BadRequestException('You must clock in before filing a report.');
    }
    if (!assignment.shift.locationId || !assignment.shift.location) {
      throw new BadRequestException('This shift has no location, so reports cannot be scoped.');
    }

    // Window: on shift until 1 hr after shift end (uses device capture time).
    const tz = await this.getOrgTimezone(tenantId);
    const at = this.resolveCapturedAt(dto.capturedAt, new Date());
    if (at.getTime() > reportingWindowClosesAt(assignment.shift, tz).getTime()) {
      throw new BadRequestException('The reporting window for this shift has closed.');
    }

    // Location scope: the patient must be at the shift's location.
    const allowed = await this.allowedPatientsForShift(assignment.shift.locationId, tenantId);
    const context = allowed.get(dto.patientId);
    if (!context) {
      throw new ForbiddenException('That patient is not at your shift location.');
    }

    const report = await this.prisma.$transaction(async (tx) => {
      const created = await tx.shiftReport.create({
        data: {
          category: dto.category ?? 'GENERAL_NOTE',
          priority: dto.priority ?? 'NORMAL',
          content: dto.content,
          detail: (dto.detail ?? undefined) as Prisma.InputJsonValue | undefined,
          shiftAssignmentId: dto.shiftAssignmentId,
          patientId: dto.patientId,
          encounterId: context.encounterId,
          locationId: assignment.shift.locationId as string,
          bedId: context.bedId,
          recordedById: userId,
          recordedAt: at,
          clientEventId: dto.clientEventId,
          capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : null,
          tenantId,
        },
      });

      // Mirror onto the patient timeline.
      await tx.patientEvent.create({
        data: {
          patientId: dto.patientId,
          eventType: PatientEventType.NOTE,
          summary: `Shift report (${created.category.toLowerCase().replace(/_/g, ' ')})`,
          detail: {
            shiftReportId: created.id,
            category: created.category,
            priority: created.priority,
            locationId: created.locationId,
            bedId: created.bedId,
          },
          careSetting: assignment.shift.location?.type,
          occurredAt: at,
          recordedById: userId,
          tenantId,
        },
      });

      return created;
    });

    this.audit
      .log({
        userId,
        action: 'CREATE',
        resource: 'ShiftReport',
        resourceId: report.id,
        tenantId,
        metadata: {
          patientId: dto.patientId,
          category: report.category,
          priority: report.priority,
        },
      })
      .catch(() => {});

    return report;
  }

  // ── My current shift context ────────────────────────

  /** The worker's currently-open shift (clocked in, within the window) + the
   * patients/beds they may report on. */
  async getMyShiftContext(userId: string, tenantId: string) {
    const cutoff = new Date(Date.now() - 36 * 60 * 60_000);
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { userId, shift: { tenantId }, clockRecord: { clockInAt: { gte: cutoff } } },
      include: {
        shift: { include: { shiftPattern: true, location: true } },
        clockRecord: true,
      },
    });

    const tz = await this.getOrgTimezone(tenantId);
    const now = Date.now();
    const open = assignments
      .filter(
        (a) =>
          a.clockRecord &&
          a.shift.locationId &&
          now <= reportingWindowClosesAt(a.shift, tz).getTime(),
      )
      .sort(
        (a, b) =>
          (b.clockRecord?.clockInAt.getTime() ?? 0) - (a.clockRecord?.clockInAt.getTime() ?? 0),
      );

    const active = open[0];
    if (!active || !active.shift.locationId) {
      return { onShift: false as const };
    }

    const allowed = await this.allowedPatientsForShift(active.shift.locationId, tenantId);
    const patientIds = [...allowed.keys()];
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: patientIds } },
      select: { id: true, givenName: true, familyName: true },
    });
    const beds = await this.prisma.bed.findMany({
      where: { id: { in: [...allowed.values()].map((v) => v.bedId).filter(Boolean) as string[] } },
      select: { id: true, identifier: true },
    });
    const bedById = new Map(beds.map((b) => [b.id, b.identifier]));

    return {
      onShift: true as const,
      shiftAssignmentId: active.id,
      shift: {
        id: active.shift.id,
        date: active.shift.date,
        pattern: {
          name: active.shift.shiftPattern.name,
          startTime: active.shift.shiftPattern.startTime,
          endTime: active.shift.shiftPattern.endTime,
        },
      },
      location: active.shift.location,
      reportingClosesAt: reportingWindowClosesAt(active.shift, tz),
      patients: patients.map((p) => {
        const ctx = allowed.get(p.id) as AllowedPatient;
        return {
          patientId: p.id,
          name: `${p.givenName} ${p.familyName}`,
          encounterId: ctx.encounterId,
          bedId: ctx.bedId,
          bed: ctx.bedId ? (bedById.get(ctx.bedId) ?? null) : null,
        };
      }),
    };
  }

  // ── List ────────────────────────────────────────────

  async listShiftReports(dto: ListShiftReportsDto, userId: string, role: string, tenantId: string) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = Math.min(parseInt(dto.limit ?? '20', 10), 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ShiftReportWhereInput = { tenantId };
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.locationId) where.locationId = dto.locationId;
    if (dto.shiftAssignmentId) where.shiftAssignmentId = dto.shiftAssignmentId;
    if (dto.from || dto.to) {
      where.recordedAt = {};
      if (dto.from) (where.recordedAt as Prisma.DateTimeFilter).gte = new Date(dto.from);
      if (dto.to) (where.recordedAt as Prisma.DateTimeFilter).lte = new Date(dto.to);
    }
    // Workers only see their own reports; admins see the whole tenant.
    if (!ADMIN_ROLES.includes(role)) where.recordedById = userId;

    const [data, total] = await Promise.all([
      this.prisma.shiftReport.findMany({
        where,
        include: {
          patient: { select: { id: true, givenName: true, familyName: true } },
          location: { select: { id: true, name: true, type: true } },
          bed: { select: { id: true, identifier: true } },
          recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
        orderBy: { recordedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.shiftReport.count({ where }),
    ]);

    return { data, total, page, limit };
  }
}
