import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchAuditLogsDto } from './dto';

/** Value the anonymisation feature writes into erased name fields. */
const ERASED = '[ERASED]';

/**
 * Resources whose `resourceId` points at a record that belongs to a patient.
 * For these we resolve resourceId → record → patientId → patient name so the
 * audit entry can say *whose* record was touched, not just a bare UUID.
 */
const PATIENT_LINKED_RESOURCES = [
  'CarePlan',
  'Assessment',
  'MedicationRequest',
  'Encounter',
  'ChcCase',
  'VirtualWardEnrolment',
] as const;

type PatientLinkedResource = (typeof PATIENT_LINKED_RESOURCES)[number];

/** Hard cap on a single CSV export (most recent rows first). */
const AUDIT_EXPORT_CAP = 50_000;

@Injectable()
export class AuditService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  // ── Create audit entry (fire-and-forget) ─────────────────

  async log(params: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    tenantId?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
          tenantId: params.tenantId,
        },
      });
    } catch {
      // Fire-and-forget: never block business logic if audit write fails
    }
  }

  // ── Search audit logs ────────────────────────────────────

  async search(dto: SearchAuditLogsDto, tenantId: string) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = parseInt(dto.limit ?? '20', 10);
    const skip = (page - 1) * limit;
    const where = this.buildWhere(dto, tenantId);

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: await this.enrichTargets(data, tenantId), total, page, limit };
  }

  private buildWhere(dto: SearchAuditLogsDto, tenantId: string): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (dto.userId) where.userId = dto.userId;
    if (dto.action) where.action = dto.action;
    if (dto.resource) where.resource = dto.resource;
    if (dto.resourceId) where.resourceId = dto.resourceId;
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) where.createdAt.gte = new Date(dto.startDate);
      if (dto.endDate) where.createdAt.lte = new Date(dto.endDate);
    }
    return where;
  }

  // ── CSV export ───────────────────────────────────────────

  /**
   * Export the matching audit entries (same filters as search, no pagination)
   * as CSV with resolved subjects. Capped at AUDIT_EXPORT_CAP most-recent rows.
   * Exporting the audit log is itself an auditable event.
   */
  async exportCsv(dto: SearchAuditLogsDto, tenantId: string, actorId: string): Promise<string> {
    const rows = await this.prisma.auditLog.findMany({
      where: this.buildWhere(dto, tenantId),
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: AUDIT_EXPORT_CAP,
    });
    const enriched = await this.enrichTargets(rows, tenantId);

    await this.log({
      userId: actorId,
      action: 'EXPORT_AUDIT_LOG',
      resource: 'AuditLog',
      tenantId,
      metadata: { rows: enriched.length, capped: enriched.length >= AUDIT_EXPORT_CAP },
    });

    const header = ['Timestamp', 'User', 'Email', 'Action', 'Resource', 'Subject', 'Resource ID'];
    const escape = (value: unknown): string => `"${(value ?? '').toString().replace(/"/g, '""')}"`;
    const lines = [header.map(escape).join(',')];
    for (const r of enriched) {
      lines.push(
        [
          r.createdAt.toISOString(),
          `${r.user.firstName} ${r.user.lastName}`,
          r.user.email,
          r.action,
          r.resource,
          r.patientName ?? r.resourceName ?? '',
          r.resourceId ?? '',
        ]
          .map(escape)
          .join(','),
      );
    }
    return lines.join('\n');
  }

  // ── Target resolution (resourceId → human-readable subject) ──

  /**
   * Enrich a page of audit rows with the subject they concern: the patient
   * (for patient-linked resources) and/or a resolved resource name. All lookups
   * are batched per resource type (no N+1) and tenant-scoped. Records that have
   * been hard-deleted resolve to `undefined`; anonymised patients resolve to a
   * clear "(erased patient)" marker rather than the raw `[ERASED]` tombstone.
   */
  private async enrichTargets<T extends { resource: string; resourceId: string | null }>(
    rows: T[],
    tenantId: string,
  ): Promise<(T & { patientId?: string; patientName?: string; resourceName?: string })[]> {
    // Row index → resolved patientId.
    const patientIdByRow = new Map<number, string>();

    // Direct Patient views: the resourceId *is* the patient id.
    rows.forEach((r, i) => {
      if (r.resource === 'Patient' && r.resourceId) patientIdByRow.set(i, r.resourceId);
    });

    // Patient-linked resources: batch-resolve record id → patientId.
    for (const resource of PATIENT_LINKED_RESOURCES) {
      const hits = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.resource === resource && r.resourceId);
      if (!hits.length) continue;
      const ids = [...new Set(hits.map(({ r }) => r.resourceId as string))];
      const patientIdByRecord = await this.patientIdsForResource(resource, ids, tenantId);
      for (const { r, i } of hits) {
        const pid = patientIdByRecord.get(r.resourceId as string);
        if (pid) patientIdByRow.set(i, pid);
      }
    }

    // Batch-fetch every referenced patient and build a display-name map.
    const patientNameById = await this.patientNames(
      [...new Set(patientIdByRow.values())],
      tenantId,
    );

    // Resolve User-resource targets (e.g. role changes) to a name.
    const userResourceIds = [
      ...new Set(
        rows
          .filter((r) => r.resource === 'User' && r.resourceId)
          .map((r) => r.resourceId as string),
      ),
    ];
    const userNameById = await this.userNames(userResourceIds);

    return rows.map((r, i) => {
      const patientId = patientIdByRow.get(i);
      return {
        ...r,
        patientId,
        patientName: patientId ? patientNameById.get(patientId) : undefined,
        resourceName:
          r.resource === 'User' && r.resourceId ? userNameById.get(r.resourceId) : undefined,
      };
    });
  }

  private async patientIdsForResource(
    resource: PatientLinkedResource,
    ids: string[],
    tenantId: string,
  ): Promise<Map<string, string>> {
    const where = { id: { in: ids }, tenantId };
    const select = { id: true, patientId: true };
    let records: { id: string; patientId: string }[];
    switch (resource) {
      case 'CarePlan':
        records = await this.prisma.carePlan.findMany({ where, select });
        break;
      case 'Assessment':
        records = await this.prisma.assessment.findMany({ where, select });
        break;
      case 'MedicationRequest':
        records = await this.prisma.medicationRequest.findMany({ where, select });
        break;
      case 'Encounter':
        records = await this.prisma.encounter.findMany({ where, select });
        break;
      case 'ChcCase':
        records = await this.prisma.chcCase.findMany({ where, select });
        break;
      case 'VirtualWardEnrolment':
        records = await this.prisma.virtualWardEnrolment.findMany({ where, select });
        break;
    }
    return new Map(records.map((r) => [r.id, r.patientId]));
  }

  private async patientNames(ids: string[], tenantId: string): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const patients = await this.prisma.patient.findMany({
      where: { id: { in: ids }, tenantId },
      select: { id: true, givenName: true, middleName: true, familyName: true },
    });
    return new Map(
      patients.map((p) => {
        const erased = p.givenName === ERASED && p.familyName === ERASED;
        const name = erased
          ? '(erased patient)'
          : [p.givenName, p.middleName, p.familyName].filter(Boolean).join(' ').trim();
        return [p.id, name || '(unnamed patient)'];
      }),
    );
  }

  private async userNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, firstName: true, lastName: true },
    });
    return new Map(
      users.map((u) => [
        u.id,
        [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || '(unknown user)',
      ]),
    );
  }

  // ── Compliance summary ───────────────────────────────────

  async getComplianceSummary(tenantId: string, startDate?: string, endDate?: string) {
    const where: Prisma.AuditLogWhereInput = { tenantId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [totalActions, resourceBreakdown, actionBreakdown, topUsersRaw] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: true,
        orderBy: { _count: { resource: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    // Resolve user names for top users
    const userIds = topUsersRaw.map((u) => u.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    const topUsers = topUsersRaw.map((u) => {
      const user = userMap.get(u.userId);
      return {
        userId: u.userId,
        name: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
        count: u._count,
      };
    });

    // Actions by day (last 30 days by default)
    const dayStart = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const dayEnd = endDate ? new Date(endDate) : new Date();

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const dayMap = new Map<string, number>();
    for (const log of logs) {
      const day = log.createdAt.toISOString().split('T')[0];
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }
    const actionsByDay = Array.from(dayMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      totalActions,
      actionsByDay,
      topUsers,
      resourceBreakdown: resourceBreakdown.map((r) => ({
        resource: r.resource,
        count: r._count,
      })),
      actionBreakdown: actionBreakdown.map((a) => ({
        action: a.action,
        count: a._count,
      })),
    };
  }
}
