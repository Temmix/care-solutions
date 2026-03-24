import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VirtualWardsService } from '../virtual-wards/virtual-wards.service';
import { EventsService } from '../events/events.service';
import { NotificationsService } from '../notifications/notifications.service';
import { IngestReadingsDto, ReadingDto } from './dto';

export interface ReadingResult {
  index: number;
  status: 'ok' | 'error';
  observationId?: string;
  error?: string;
}

@Injectable()
export class IotIngestionService {
  private readonly logger = new Logger(IotIngestionService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(VirtualWardsService) private vwService: VirtualWardsService,
    @Inject(EventsService) private events: EventsService,
    @Inject(NotificationsService) private notifications: NotificationsService,
  ) {}

  async ingest(
    dto: IngestReadingsDto,
    tenantId: string,
    apiKeyDeviceId: string | null,
  ): Promise<{ processed: number; results: ReadingResult[] }> {
    const results: ReadingResult[] = [];

    for (let i = 0; i < dto.readings.length; i++) {
      try {
        const result = await this.processReading(dto.readings[i], tenantId, apiKeyDeviceId);
        results.push({ index: i, status: 'ok', observationId: result.observationId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.warn(`Ingestion error at index ${i}: ${message}`);
        results.push({ index: i, status: 'error', error: message });
      }
    }

    return { processed: results.filter((r) => r.status === 'ok').length, results };
  }

  private async processReading(
    reading: ReadingDto,
    tenantId: string,
    apiKeyDeviceId: string | null,
  ): Promise<{ observationId: string }> {
    // 1. Look up device
    const device = await this.prisma.iotDevice.findUnique({
      where: {
        serialNumber_tenantId: { serialNumber: reading.deviceSerialNumber, tenantId },
      },
    });
    if (!device) {
      throw new Error(`Device not found: ${reading.deviceSerialNumber}`);
    }
    if (device.status === 'DECOMMISSIONED') {
      throw new Error(`Device is decommissioned: ${reading.deviceSerialNumber}`);
    }

    // 2. If API key is device-scoped, verify it matches
    if (apiKeyDeviceId && apiKeyDeviceId !== device.id) {
      throw new Error('API key is scoped to a different device');
    }

    // 3. Find active assignment
    const assignment = await this.prisma.iotDeviceAssignment.findFirst({
      where: { deviceId: device.id, isActive: true },
      include: { enrolment: true },
    });
    if (!assignment) {
      throw new Error(`Device ${reading.deviceSerialNumber} has no active assignment`);
    }

    // 4. Update device status
    await this.prisma.iotDevice.update({
      where: { id: device.id },
      data: {
        lastSeenAt: new Date(),
        batteryLevel: reading.batteryLevel ?? device.batteryLevel,
        status: 'ACTIVE',
      },
    });

    // 5. Create VitalObservation
    const observation = await this.prisma.vitalObservation.create({
      data: {
        enrolmentId: assignment.enrolmentId,
        vitalType: reading.vitalType as never,
        value: reading.value,
        unit: reading.unit,
        recordedAt: reading.recordedAt ? new Date(reading.recordedAt) : new Date(),
        recorderId: null,
        deviceId: device.id,
      },
    });

    // 6. Check thresholds (reuse existing logic)
    await this.vwService.checkThresholdsForVital(
      assignment.enrolmentId,
      reading.vitalType,
      reading.value,
      tenantId,
    );

    // 7. Emit WebSocket event
    this.events.emitVirtualWardVitals(tenantId, {
      enrolmentId: assignment.enrolmentId,
      observationId: observation.id,
      vitalType: reading.vitalType,
      value: reading.value,
      unit: reading.unit,
      deviceSerialNumber: reading.deviceSerialNumber,
    });

    // 8. Battery alert
    if (reading.batteryLevel !== undefined && reading.batteryLevel < 20) {
      this.handleLowBattery(
        device.id,
        reading.deviceSerialNumber,
        reading.batteryLevel,
        tenantId,
      ).catch(() => {});
    }

    return { observationId: observation.id };
  }

  private async handleLowBattery(
    deviceId: string,
    serialNumber: string,
    batteryLevel: number,
    tenantId: string,
  ): Promise<void> {
    // Find admins in this tenant to notify
    const admins = await this.prisma.userTenantMembership.findMany({
      where: { organizationId: tenantId, status: 'ACTIVE', role: 'ADMIN' },
      select: { userId: true },
      take: 5,
    });

    for (const admin of admins) {
      this.notifications
        .notify({
          userId: admin.userId,
          tenantId,
          type: 'DEVICE_BATTERY_LOW' as never,
          title: 'Device Battery Low',
          message: `Device ${serialNumber} battery is at ${batteryLevel}%`,
          link: `/app/iot/devices/${deviceId}`,
        })
        .catch(() => {});
    }
  }
}
