import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EnrolPatientDto,
  CreateProtocolDto,
  UpdateProtocolDto,
  RecordObservationDto,
  AlertAction,
  DischargeVwDto,
  SearchEnrolmentsDto,
} from './dto';

@Injectable()
export class VirtualWardsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(EventsService) private events: EventsService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(NotificationsService) private notifications: NotificationsService,
  ) {}

  // ── Enrol patient ────────────────────────────────────────

  async enrolPatient(dto: EnrolPatientDto, userId: string, tenantId: string) {
    const enrolment = await this.prisma.virtualWardEnrolment.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        clinicalSummary: dto.clinicalSummary,
        enrollerId: userId,
        tenantId,
        status: 'ENROLLED',
      },
      include: {
        patient: { select: { givenName: true, familyName: true } },
      },
    });

    await this.prisma.patientEvent.create({
      data: {
        patientId: dto.patientId,
        eventType: 'VIRTUAL_WARD_ENROLLED',
        summary: 'Patient enrolled in virtual ward',
        detail: { enrolmentId: enrolment.id },
        recordedById: userId,
        tenantId,
      },
    });

    this.audit
      .log({
        userId,
        action: 'ENROL',
        resource: 'VirtualWardEnrolment',
        resourceId: enrolment.id,
        tenantId,
        metadata: { patientId: dto.patientId },
      })
      .catch(() => {});

    return enrolment;
  }

  // ── Search enrolments ────────────────────────────────────

  async searchEnrolments(dto: SearchEnrolmentsDto, tenantId: string) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = parseInt(dto.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.patientId) where.patientId = dto.patientId;

    const [data, total] = await Promise.all([
      this.prisma.virtualWardEnrolment.findMany({
        where,
        include: {
          patient: { select: { givenName: true, familyName: true, birthDate: true } },
          enroller: { select: { firstName: true, lastName: true } },
          _count: { select: { alerts: { where: { status: 'OPEN' } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.virtualWardEnrolment.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Dashboard ────────────────────────────────────────────

  async getDashboard(tenantId: string) {
    const [enrolled, openAlerts, alertsBySeverity] = await Promise.all([
      this.prisma.virtualWardEnrolment.count({
        where: { tenantId, status: { in: ['ENROLLED', 'MONITORING', 'ESCALATED'] } },
      }),
      this.prisma.virtualWardAlert.count({
        where: {
          enrolment: { tenantId },
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
      }),
      this.prisma.virtualWardAlert.groupBy({
        by: ['severity'],
        where: {
          enrolment: { tenantId },
          status: { in: ['OPEN', 'ACKNOWLEDGED'] },
        },
        _count: true,
      }),
    ]);

    return {
      enrolledCount: enrolled,
      openAlertCount: openAlerts,
      alertsBySeverity: alertsBySeverity.map((a) => ({
        severity: a.severity,
        count: a._count,
      })),
    };
  }

  // ── Get enrolment detail ─────────────────────────────────

  async getEnrolment(id: string, tenantId: string) {
    const enrolment = await this.prisma.virtualWardEnrolment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, givenName: true, familyName: true, birthDate: true } },
        encounter: { select: { id: true, status: true, class: true } },
        enroller: { select: { firstName: true, lastName: true } },
        discharger: { select: { firstName: true, lastName: true } },
        protocols: {
          include: { thresholds: true },
          orderBy: { vitalType: 'asc' },
        },
        observations: {
          orderBy: { recordedAt: 'desc' },
          take: 50,
          include: { recorder: { select: { firstName: true, lastName: true } } },
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            acknowledger: { select: { firstName: true, lastName: true } },
            escalatedTo: { select: { firstName: true, lastName: true } },
            resolver: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!enrolment || enrolment.tenantId !== tenantId) {
      throw new NotFoundException('Enrolment not found');
    }

    return enrolment;
  }

  // ── Protocols ────────────────────────────────────────────

  async createProtocol(enrolmentId: string, dto: CreateProtocolDto, tenantId: string) {
    await this.requireEnrolment(enrolmentId, tenantId);

    return this.prisma.monitoringProtocol.create({
      data: {
        enrolmentId,
        vitalType: dto.vitalType,
        frequencyHours: dto.frequencyHours,
        thresholds: {
          create: dto.thresholds.map((t) => ({
            minValue: t.minValue,
            maxValue: t.maxValue,
            severity: t.severity,
          })),
        },
      },
      include: { thresholds: true },
    });
  }

  async updateProtocol(
    enrolmentId: string,
    protocolId: string,
    dto: UpdateProtocolDto,
    tenantId: string,
  ) {
    await this.requireEnrolment(enrolmentId, tenantId);

    const protocol = await this.prisma.monitoringProtocol.findUnique({
      where: { id: protocolId },
    });
    if (!protocol || protocol.enrolmentId !== enrolmentId) {
      throw new NotFoundException('Protocol not found');
    }

    // Update thresholds if provided (replace all)
    if (dto.thresholds) {
      await this.prisma.vitalThreshold.deleteMany({ where: { protocolId } });
      await this.prisma.vitalThreshold.createMany({
        data: dto.thresholds.map((t) => ({
          protocolId,
          minValue: t.minValue,
          maxValue: t.maxValue,
          severity: t.severity,
        })),
      });
    }

    return this.prisma.monitoringProtocol.update({
      where: { id: protocolId },
      data: {
        frequencyHours: dto.frequencyHours ?? protocol.frequencyHours,
        isActive: dto.isActive ?? protocol.isActive,
      },
      include: { thresholds: true },
    });
  }

  async deleteProtocol(enrolmentId: string, protocolId: string, tenantId: string) {
    await this.requireEnrolment(enrolmentId, tenantId);

    const protocol = await this.prisma.monitoringProtocol.findUnique({
      where: { id: protocolId },
    });
    if (!protocol || protocol.enrolmentId !== enrolmentId) {
      throw new NotFoundException('Protocol not found');
    }

    await this.prisma.monitoringProtocol.delete({ where: { id: protocolId } });
    return { deleted: true };
  }

  // ── Observations ─────────────────────────────────────────

  async recordObservation(
    enrolmentId: string,
    dto: RecordObservationDto,
    userId: string,
    tenantId: string,
  ) {
    const enrolment = await this.requireEnrolment(enrolmentId, tenantId);

    const observation = await this.prisma.vitalObservation.create({
      data: {
        enrolmentId,
        vitalType: dto.vitalType,
        value: dto.value,
        unit: dto.unit,
        notes: dto.notes,
        recorderId: userId,
      },
    });

    // Check thresholds for auto-alerts
    await this.checkThresholdsForVital(enrolmentId, dto.vitalType, dto.value, enrolment.tenantId);

    this.audit
      .log({
        userId,
        action: 'RECORD_OBSERVATION',
        resource: 'VirtualWardEnrolment',
        resourceId: enrolmentId,
        tenantId,
        metadata: { vitalType: dto.vitalType, value: dto.value },
      })
      .catch(() => {});

    return observation;
  }

  async getObservations(enrolmentId: string, tenantId: string) {
    await this.requireEnrolment(enrolmentId, tenantId);

    return this.prisma.vitalObservation.findMany({
      where: { enrolmentId },
      include: { recorder: { select: { firstName: true, lastName: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });
  }

  // ── Alerts ───────────────────────────────────────────────

  async getAlerts(enrolmentId: string, tenantId: string) {
    await this.requireEnrolment(enrolmentId, tenantId);

    return this.prisma.virtualWardAlert.findMany({
      where: { enrolmentId },
      include: {
        acknowledger: { select: { firstName: true, lastName: true } },
        escalatedTo: { select: { firstName: true, lastName: true } },
        resolver: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeAlert(enrolmentId: string, alertId: string, userId: string, tenantId: string) {
    await this.requireEnrolment(enrolmentId, tenantId);
    const alert = await this.requireAlert(alertId, enrolmentId);

    if (alert.status !== 'OPEN') {
      throw new BadRequestException('Alert is not in OPEN status');
    }

    const updated = await this.prisma.virtualWardAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgerId: userId,
        acknowledgedAt: new Date(),
      },
    });

    this.audit
      .log({
        userId,
        action: 'ACKNOWLEDGE_ALERT',
        resource: 'VirtualWardAlert',
        resourceId: alertId,
        tenantId,
        metadata: { enrolmentId },
      })
      .catch(() => {});

    return updated;
  }

  async escalateAlert(
    enrolmentId: string,
    alertId: string,
    escalatedToId: string,
    userId: string,
    tenantId: string,
  ) {
    await this.requireEnrolment(enrolmentId, tenantId);
    const alert = await this.requireAlert(alertId, enrolmentId);

    if (alert.status === 'RESOLVED') {
      throw new BadRequestException('Cannot escalate a resolved alert');
    }

    const updated = await this.prisma.virtualWardAlert.update({
      where: { id: alertId },
      data: {
        status: 'ESCALATED',
        escalatedToId,
        escalatedAt: new Date(),
      },
    });

    // Update enrolment status
    await this.prisma.virtualWardEnrolment.update({
      where: { id: enrolmentId },
      data: { status: 'ESCALATED' },
    });

    this.audit
      .log({
        userId,
        action: 'ESCALATE_ALERT',
        resource: 'VirtualWardAlert',
        resourceId: alertId,
        tenantId,
        metadata: { enrolmentId, escalatedToId },
      })
      .catch(() => {});

    this.notifications
      .notify({
        userId: escalatedToId,
        tenantId,
        type: NotificationType.VW_ALERT_ESCALATED,
        title: 'Alert Escalated to You',
        message: 'A virtual ward alert has been escalated and requires your attention',
        link: `/app/virtual-wards/${enrolmentId}`,
      })
      .catch(() => {});

    return updated;
  }

  async resolveAlert(
    enrolmentId: string,
    alertId: string,
    resolveNotes: string | undefined,
    userId: string,
    tenantId: string,
  ) {
    await this.requireEnrolment(enrolmentId, tenantId);
    await this.requireAlert(alertId, enrolmentId);

    const updated = await this.prisma.virtualWardAlert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolverId: userId,
        resolveNotes,
        resolvedAt: new Date(),
      },
    });

    this.audit
      .log({
        userId,
        action: 'RESOLVE_ALERT',
        resource: 'VirtualWardAlert',
        resourceId: alertId,
        tenantId,
        metadata: { enrolmentId },
      })
      .catch(() => {});

    return updated;
  }

  // ── Discharge ────────────────────────────────────────────

  async discharge(id: string, dto: DischargeVwDto, userId: string, tenantId: string) {
    const enrolment = await this.requireEnrolment(id, tenantId);

    if (enrolment.status === 'DISCHARGED') {
      throw new BadRequestException('Already discharged');
    }

    const updated = await this.prisma.virtualWardEnrolment.update({
      where: { id },
      data: {
        status: 'DISCHARGED',
        dischargeDate: new Date(),
        dischargeReason: dto.dischargeReason,
        clinicalSummary: dto.clinicalSummary ?? enrolment.clinicalSummary,
        dischargerId: userId,
      },
    });

    await this.prisma.patientEvent.create({
      data: {
        patientId: enrolment.patientId,
        eventType: 'VIRTUAL_WARD_DISCHARGED',
        summary: `Patient discharged from virtual ward: ${dto.dischargeReason}`,
        detail: { enrolmentId: id },
        recordedById: userId,
        tenantId,
      },
    });

    this.audit
      .log({
        userId,
        action: 'DISCHARGE',
        resource: 'VirtualWardEnrolment',
        resourceId: id,
        tenantId,
        metadata: { dischargeReason: dto.dischargeReason },
      })
      .catch(() => {});

    return updated;
  }

  // ── Helpers ──────────────────────────────────────────────

  private async requireEnrolment(id: string, tenantId: string) {
    const enrolment = await this.prisma.virtualWardEnrolment.findUnique({
      where: { id },
    });
    if (!enrolment || enrolment.tenantId !== tenantId) {
      throw new NotFoundException('Enrolment not found');
    }
    return enrolment;
  }

  private async requireAlert(alertId: string, enrolmentId: string) {
    const alert = await this.prisma.virtualWardAlert.findUnique({
      where: { id: alertId },
    });
    if (!alert || alert.enrolmentId !== enrolmentId) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  async checkThresholdsForVital(
    enrolmentId: string,
    vitalType: string,
    value: number,
    tenantId: string,
  ): Promise<void> {
    const protocols = await this.prisma.monitoringProtocol.findMany({
      where: { enrolmentId, vitalType: vitalType as never, isActive: true },
      include: { thresholds: true },
    });

    for (const protocol of protocols) {
      for (const threshold of protocol.thresholds) {
        const breached =
          (threshold.minValue !== null && value < threshold.minValue) ||
          (threshold.maxValue !== null && value > threshold.maxValue);

        if (breached) {
          const breachDesc =
            threshold.minValue !== null && value < threshold.minValue
              ? `below ${threshold.minValue}`
              : `above ${threshold.maxValue}`;

          const alert = await this.prisma.virtualWardAlert.create({
            data: {
              enrolmentId,
              severity: threshold.severity,
              message: `${vitalType.replace(/_/g, ' ')} reading ${value} is ${breachDesc}`,
              vitalType: vitalType as never,
              triggerValue: value,
              thresholdBreached: breachDesc,
            },
          });

          // Emit WebSocket event
          this.events.emitVirtualWardAlert(tenantId, {
            enrolmentId,
            alertId: alert.id,
            severity: alert.severity,
            message: alert.message,
          });

          // Create patient timeline event
          const enrolment = await this.prisma.virtualWardEnrolment.findUnique({
            where: { id: enrolmentId },
          });
          if (enrolment) {
            await this.prisma.patientEvent.create({
              data: {
                patientId: enrolment.patientId,
                eventType: 'VIRTUAL_WARD_ALERT',
                summary: `Virtual ward alert: ${alert.message}`,
                detail: { alertId: alert.id, severity: alert.severity },
                recordedById: enrolment.enrollerId,
                tenantId,
              },
            });

            this.notifications
              .notify({
                userId: enrolment.enrollerId,
                tenantId,
                type: NotificationType.VW_THRESHOLD_BREACH,
                title: 'Threshold Breach Detected',
                message: `A vital observation has breached the configured threshold`,
                link: `/app/virtual-wards/${enrolmentId}`,
              })
              .catch(() => {});
          }
        }
      }
    }
  }
}
