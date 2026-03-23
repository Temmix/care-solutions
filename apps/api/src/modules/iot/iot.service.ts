import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  RegisterDeviceDto,
  UpdateDeviceDto,
  AssignDeviceDto,
  CreateApiKeyDto,
  DeviceQueryDto,
} from './dto';

@Injectable()
export class IotService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  // ── Device CRUD ────────────────────────────────────────

  async registerDevice(dto: RegisterDeviceDto, userId: string, tenantId: string) {
    const existing = await this.prisma.iotDevice.findUnique({
      where: { serialNumber_tenantId: { serialNumber: dto.serialNumber, tenantId } },
    });
    if (existing) {
      throw new ConflictException('Device with this serial number already exists');
    }

    const device = await this.prisma.iotDevice.create({
      data: {
        serialNumber: dto.serialNumber,
        deviceType: dto.deviceType as never,
        manufacturer: dto.manufacturer,
        model: dto.model,
        tenantId,
      },
    });

    this.audit
      .log({
        userId,
        action: 'REGISTER_DEVICE',
        resource: 'IotDevice',
        resourceId: device.id,
        tenantId,
        metadata: { serialNumber: dto.serialNumber, deviceType: dto.deviceType },
      })
      .catch(() => {});

    return device;
  }

  async listDevices(query: DeviceQueryDto, tenantId: string) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (query.status) where.status = query.status;
    if (query.deviceType) where.deviceType = query.deviceType;

    const [data, total] = await Promise.all([
      this.prisma.iotDevice.findMany({
        where,
        include: {
          assignments: {
            where: { isActive: true },
            include: {
              enrolment: {
                include: { patient: { select: { givenName: true, familyName: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.iotDevice.count({ where }),
    ]);

    // Compute online status: device is online if lastSeenAt within 5 minutes
    const enriched = data.map((d) => ({
      ...d,
      isOnline: d.lastSeenAt ? Date.now() - d.lastSeenAt.getTime() < 5 * 60 * 1000 : false,
    }));

    return { data: enriched, total, page, limit };
  }

  async getDevice(id: string, tenantId: string) {
    const device = await this.prisma.iotDevice.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            enrolment: {
              include: { patient: { select: { id: true, givenName: true, familyName: true } } },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        observations: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!device || device.tenantId !== tenantId) {
      throw new NotFoundException('Device not found');
    }

    return {
      ...device,
      isOnline: device.lastSeenAt
        ? Date.now() - device.lastSeenAt.getTime() < 5 * 60 * 1000
        : false,
    };
  }

  async updateDevice(id: string, dto: UpdateDeviceDto, userId: string, tenantId: string) {
    const device = await this.requireDevice(id, tenantId);

    if (device.status === 'DECOMMISSIONED') {
      throw new BadRequestException('Cannot update a decommissioned device');
    }

    const updated = await this.prisma.iotDevice.update({
      where: { id },
      data: {
        manufacturer: dto.manufacturer ?? device.manufacturer,
        model: dto.model ?? device.model,
        firmwareVersion: dto.firmwareVersion ?? device.firmwareVersion,
      },
    });

    this.audit
      .log({
        userId,
        action: 'UPDATE_DEVICE',
        resource: 'IotDevice',
        resourceId: id,
        tenantId,
      })
      .catch(() => {});

    return updated;
  }

  async decommissionDevice(id: string, userId: string, tenantId: string) {
    await this.requireDevice(id, tenantId);

    // Unassign any active assignments
    await this.prisma.iotDeviceAssignment.updateMany({
      where: { deviceId: id, isActive: true },
      data: { isActive: false, unassignedAt: new Date() },
    });

    const updated = await this.prisma.iotDevice.update({
      where: { id },
      data: { status: 'DECOMMISSIONED' },
    });

    this.audit
      .log({
        userId,
        action: 'DECOMMISSION_DEVICE',
        resource: 'IotDevice',
        resourceId: id,
        tenantId,
      })
      .catch(() => {});

    return updated;
  }

  // ── Assignment ─────────────────────────────────────────

  async assignDevice(deviceId: string, dto: AssignDeviceDto, userId: string, tenantId: string) {
    const device = await this.requireDevice(deviceId, tenantId);

    if (device.status === 'DECOMMISSIONED') {
      throw new BadRequestException('Cannot assign a decommissioned device');
    }

    // Verify enrolment exists in same tenant
    const enrolment = await this.prisma.virtualWardEnrolment.findUnique({
      where: { id: dto.enrolmentId },
    });
    if (!enrolment || enrolment.tenantId !== tenantId) {
      throw new NotFoundException('Enrolment not found');
    }

    // Check if device already actively assigned to this enrolment
    const existing = await this.prisma.iotDeviceAssignment.findFirst({
      where: { deviceId, enrolmentId: dto.enrolmentId, isActive: true },
    });
    if (existing) {
      throw new ConflictException('Device is already assigned to this enrolment');
    }

    const assignment = await this.prisma.iotDeviceAssignment.create({
      data: {
        deviceId,
        enrolmentId: dto.enrolmentId,
      },
    });

    this.audit
      .log({
        userId,
        action: 'ASSIGN_DEVICE',
        resource: 'IotDevice',
        resourceId: deviceId,
        tenantId,
        metadata: { enrolmentId: dto.enrolmentId },
      })
      .catch(() => {});

    return assignment;
  }

  async unassignDevice(deviceId: string, userId: string, tenantId: string) {
    await this.requireDevice(deviceId, tenantId);

    const active = await this.prisma.iotDeviceAssignment.findFirst({
      where: { deviceId, isActive: true },
    });
    if (!active) {
      throw new BadRequestException('Device has no active assignment');
    }

    const updated = await this.prisma.iotDeviceAssignment.update({
      where: { id: active.id },
      data: { isActive: false, unassignedAt: new Date() },
    });

    this.audit
      .log({
        userId,
        action: 'UNASSIGN_DEVICE',
        resource: 'IotDevice',
        resourceId: deviceId,
        tenantId,
      })
      .catch(() => {});

    return updated;
  }

  // ── API Keys ───────────────────────────────────────────

  async createApiKey(dto: CreateApiKeyDto, userId: string, tenantId: string) {
    // If device-scoped, verify device exists and no key already assigned
    if (dto.deviceId) {
      const device = await this.requireDevice(dto.deviceId, tenantId);
      const existingKey = await this.prisma.iotApiKey.findUnique({
        where: { deviceId: device.id },
      });
      if (existingKey) {
        throw new ConflictException('Device already has an API key assigned');
      }
    }

    const rawKey = 'cvk_' + randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await this.prisma.iotApiKey.create({
      data: {
        keyHash,
        keyPrefix,
        name: dto.name,
        deviceId: dto.deviceId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        tenantId,
      },
    });

    this.audit
      .log({
        userId,
        action: 'CREATE_API_KEY',
        resource: 'IotApiKey',
        resourceId: apiKey.id,
        tenantId,
        metadata: { name: dto.name, deviceId: dto.deviceId },
      })
      .catch(() => {});

    // Return raw key ONCE — never stored
    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      rawKey,
      deviceId: apiKey.deviceId,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async listApiKeys(tenantId: string) {
    return this.prisma.iotApiKey.findMany({
      where: { tenantId },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        deviceId: true,
        device: { select: { serialNumber: true, deviceType: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeApiKey(id: string, userId: string, tenantId: string) {
    const key = await this.prisma.iotApiKey.findUnique({ where: { id } });
    if (!key || key.tenantId !== tenantId) {
      throw new NotFoundException('API key not found');
    }

    const updated = await this.prisma.iotApiKey.update({
      where: { id },
      data: { isActive: false },
    });

    this.audit
      .log({
        userId,
        action: 'REVOKE_API_KEY',
        resource: 'IotApiKey',
        resourceId: id,
        tenantId,
      })
      .catch(() => {});

    return updated;
  }

  // ── Helpers ────────────────────────────────────────────

  private async requireDevice(id: string, tenantId: string) {
    const device = await this.prisma.iotDevice.findUnique({ where: { id } });
    if (!device || device.tenantId !== tenantId) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }
}
