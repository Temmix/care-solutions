import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma, SecurityIncident, IncidentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';

const ICO_REPORT_WINDOW_MS = 72 * 60 * 60 * 1000; // ICO must be notified within 72h

export type IncidentView = SecurityIncident & {
  icoReportDeadline: Date;
  icoReportOverdue: boolean;
};

/**
 * Security / data-protection incident register — NHS DSPT incident management
 * plus ICO 72-hour breach-reporting support. Append + status transitions only.
 */
@Injectable()
export class IncidentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(dto: CreateIncidentDto, actorId: string, tenantId: string): Promise<IncidentView> {
    const incident = await this.prisma.securityIncident.create({
      data: {
        reference: `INC-${randomUUID().slice(0, 8).toUpperCase()}`,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        severity: dto.severity,
        affectedDataSubjects: dto.affectedDataSubjects ?? null,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : null,
        discoveredAt: dto.discoveredAt ? new Date(dto.discoveredAt) : undefined,
        icoReportable: dto.icoReportable ?? false,
        reportedById: actorId,
        tenantId,
      },
    });

    await this.audit(actorId, tenantId, 'CREATE', incident);
    return this.toView(incident);
  }

  async list(tenantId: string, status?: IncidentStatus): Promise<IncidentView[]> {
    const where: Prisma.SecurityIncidentWhereInput = { tenantId };
    if (status) where.status = status;
    const incidents = await this.prisma.securityIncident.findMany({
      where,
      orderBy: { discoveredAt: 'desc' },
    });
    return incidents.map((i) => this.toView(i));
  }

  async get(id: string, tenantId: string): Promise<IncidentView> {
    const incident = await this.requireIncident(id, tenantId);
    return this.toView(incident);
  }

  async update(
    id: string,
    dto: UpdateIncidentDto,
    actorId: string,
    tenantId: string,
  ): Promise<IncidentView> {
    const existing = await this.requireIncident(id, tenantId);

    const data: Prisma.SecurityIncidentUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.affectedDataSubjects !== undefined)
      data.affectedDataSubjects = dto.affectedDataSubjects;
    if (dto.occurredAt !== undefined) data.occurredAt = new Date(dto.occurredAt);
    if (dto.icoReportable !== undefined) data.icoReportable = dto.icoReportable;
    if (dto.assignedToId !== undefined) data.assignedToId = dto.assignedToId;

    // Status transitions stamp the matching timeline field once.
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === IncidentStatus.CONTAINED && !existing.containedAt)
        data.containedAt = new Date();
      if (dto.status === IncidentStatus.RESOLVED && !existing.resolvedAt)
        data.resolvedAt = new Date();
    }

    // Record ICO notification time once.
    if (dto.icoReported && !existing.icoReportedAt) {
      data.icoReportedAt = new Date();
      data.icoReportable = true;
    }

    const updated = await this.prisma.securityIncident.update({ where: { id }, data });
    await this.audit(actorId, tenantId, 'UPDATE', updated);
    return this.toView(updated);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private async requireIncident(id: string, tenantId: string): Promise<SecurityIncident> {
    const incident = await this.prisma.securityIncident.findFirst({ where: { id, tenantId } });
    if (!incident) throw new NotFoundException('Incident not found.');
    return incident;
  }

  private toView(incident: SecurityIncident): IncidentView {
    const icoReportDeadline = new Date(incident.discoveredAt.getTime() + ICO_REPORT_WINDOW_MS);
    const icoReportOverdue =
      incident.icoReportable &&
      !incident.icoReportedAt &&
      incident.status !== IncidentStatus.CLOSED &&
      Date.now() > icoReportDeadline.getTime();
    return { ...incident, icoReportDeadline, icoReportOverdue };
  }

  private async audit(
    actorId: string,
    tenantId: string,
    action: 'CREATE' | 'UPDATE',
    incident: SecurityIncident,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: `${action}_INCIDENT`,
        resource: 'SecurityIncident',
        resourceId: incident.id,
        tenantId,
        metadata: { reference: incident.reference, severity: incident.severity },
      },
    });
  }
}
