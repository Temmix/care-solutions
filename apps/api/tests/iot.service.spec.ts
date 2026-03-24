import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { IotService } from '../src/modules/iot/iot.service';

// ── Helpers ──────────────────────────────────────────────

const TENANT = 'tenant-1';
const USER_ID = 'user-1';

function makePrisma() {
  return {
    iotDevice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    iotDeviceAssignment: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    iotApiKey: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    virtualWardEnrolment: {
      findUnique: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

// ── IotService ──────────────────────────────────────────

describe('IotService', () => {
  let service: IotService;
  let prisma: ReturnType<typeof makePrisma>;
  let audit: ReturnType<typeof makeAudit>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    audit = makeAudit();
    service = new IotService(prisma as any, audit as any);
  });

  // ── registerDevice ──────────────────────────────────

  describe('registerDevice', () => {
    const dto = { serialNumber: 'OX-001', deviceType: 'PULSE_OXIMETER' };

    it('creates a device and returns it', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(null);
      const created = { id: 'd1', ...dto, tenantId: TENANT };
      prisma.iotDevice.create.mockResolvedValue(created);

      const result = await service.registerDevice(dto as any, USER_ID, TENANT);
      expect(result).toEqual(created);
      expect(prisma.iotDevice.create).toHaveBeenCalledWith({
        data: {
          serialNumber: 'OX-001',
          deviceType: 'PULSE_OXIMETER',
          manufacturer: undefined,
          model: undefined,
          tenantId: TENANT,
        },
      });
    });

    it('throws ConflictException if serial number already exists', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1' });
      await expect(service.registerDevice(dto as any, USER_ID, TENANT)).rejects.toThrow(
        ConflictException,
      );
    });

    it('calls audit log after registration', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(null);
      prisma.iotDevice.create.mockResolvedValue({ id: 'd1' });

      await service.registerDevice(dto as any, USER_ID, TENANT);
      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 10));

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: USER_ID,
          action: 'REGISTER_DEVICE',
          resource: 'IotDevice',
          resourceId: 'd1',
          tenantId: TENANT,
        }),
      );
    });
  });

  // ── listDevices ─────────────────────────────────────

  describe('listDevices', () => {
    it('returns paginated devices with online status', async () => {
      const recentDate = new Date(Date.now() - 60_000); // 1 min ago
      const oldDate = new Date(Date.now() - 600_000); // 10 min ago
      const devices = [
        { id: 'd1', lastSeenAt: recentDate },
        { id: 'd2', lastSeenAt: oldDate },
        { id: 'd3', lastSeenAt: null },
      ];
      prisma.iotDevice.findMany.mockResolvedValue(devices);
      prisma.iotDevice.count.mockResolvedValue(3);

      const result = await service.listDevices({ page: '1', limit: '20' } as any, TENANT);

      expect(result.data[0].isOnline).toBe(true);
      expect(result.data[1].isOnline).toBe(false);
      expect(result.data[2].isOnline).toBe(false);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });

    it('applies status filter when provided', async () => {
      prisma.iotDevice.findMany.mockResolvedValue([]);
      prisma.iotDevice.count.mockResolvedValue(0);

      await service.listDevices({ status: 'ACTIVE', page: '1', limit: '20' } as any, TENANT);

      expect(prisma.iotDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, status: 'ACTIVE' },
        }),
      );
    });

    it('calculates correct skip for pagination', async () => {
      prisma.iotDevice.findMany.mockResolvedValue([]);
      prisma.iotDevice.count.mockResolvedValue(0);

      await service.listDevices({ page: '3', limit: '10' } as any, TENANT);

      expect(prisma.iotDevice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });
  });

  // ── getDevice ───────────────────────────────────────

  describe('getDevice', () => {
    it('returns device with isOnline computed', async () => {
      const device = {
        id: 'd1',
        tenantId: TENANT,
        lastSeenAt: new Date(Date.now() - 60_000),
        assignments: [],
        observations: [],
      };
      prisma.iotDevice.findUnique.mockResolvedValue(device);

      const result = await service.getDevice('d1', TENANT);
      expect(result.isOnline).toBe(true);
    });

    it('throws NotFoundException if device not found', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(null);
      await expect(service.getDevice('d1', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if device belongs to different tenant', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1', tenantId: 'other-tenant' });
      await expect(service.getDevice('d1', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateDevice ────────────────────────────────────

  describe('updateDevice', () => {
    it('updates device metadata', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'REGISTERED',
        manufacturer: 'Old',
        model: 'M1',
        firmwareVersion: null,
      });
      prisma.iotDevice.update.mockResolvedValue({ id: 'd1' });

      await service.updateDevice('d1', { manufacturer: 'New' } as any, USER_ID, TENANT);
      expect(prisma.iotDevice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'd1' },
          data: expect.objectContaining({ manufacturer: 'New' }),
        }),
      );
    });

    it('throws BadRequestException for decommissioned device', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'DECOMMISSIONED',
      });
      await expect(
        service.updateDevice('d1', { manufacturer: 'X' } as any, USER_ID, TENANT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── decommissionDevice ──────────────────────────────

  describe('decommissionDevice', () => {
    it('decommissions device and unassigns active assignments', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1', tenantId: TENANT });
      prisma.iotDeviceAssignment.updateMany.mockResolvedValue({ count: 1 });
      prisma.iotDevice.update.mockResolvedValue({ id: 'd1', status: 'DECOMMISSIONED' });

      const result = await service.decommissionDevice('d1', USER_ID, TENANT);
      expect(result.status).toBe('DECOMMISSIONED');
      expect(prisma.iotDeviceAssignment.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 'd1', isActive: true },
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it('throws NotFoundException if device does not exist', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(null);
      await expect(service.decommissionDevice('d1', USER_ID, TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── assignDevice ────────────────────────────────────

  describe('assignDevice', () => {
    const dto = { enrolmentId: 'e1' };

    it('creates assignment', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'ACTIVE',
      });
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({ id: 'e1', tenantId: TENANT });
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(null);
      const assignment = { id: 'a1', deviceId: 'd1', enrolmentId: 'e1' };
      prisma.iotDeviceAssignment.create.mockResolvedValue(assignment);

      const result = await service.assignDevice('d1', dto as any, USER_ID, TENANT);
      expect(result).toEqual(assignment);
    });

    it('throws BadRequestException for decommissioned device', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'DECOMMISSIONED',
      });
      await expect(service.assignDevice('d1', dto as any, USER_ID, TENANT)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if enrolment not found', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'ACTIVE',
      });
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue(null);
      await expect(service.assignDevice('d1', dto as any, USER_ID, TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException if already assigned to same enrolment', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({
        id: 'd1',
        tenantId: TENANT,
        status: 'ACTIVE',
      });
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({ id: 'e1', tenantId: TENANT });
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue({ id: 'a1' });
      await expect(service.assignDevice('d1', dto as any, USER_ID, TENANT)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ── unassignDevice ──────────────────────────────────

  describe('unassignDevice', () => {
    it('deactivates active assignment', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1', tenantId: TENANT });
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue({ id: 'a1' });
      prisma.iotDeviceAssignment.update.mockResolvedValue({ id: 'a1', isActive: false });

      const result = await service.unassignDevice('d1', USER_ID, TENANT);
      expect(result.isActive).toBe(false);
    });

    it('throws BadRequestException if no active assignment', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1', tenantId: TENANT });
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(null);
      await expect(service.unassignDevice('d1', USER_ID, TENANT)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── createApiKey ────────────────────────────────────

  describe('createApiKey', () => {
    it('creates API key and returns raw key', async () => {
      const created = {
        id: 'k1',
        name: 'Test',
        keyPrefix: 'cvk_abcd1234',
        deviceId: null,
        expiresAt: null,
        createdAt: new Date(),
      };
      prisma.iotApiKey.create.mockResolvedValue(created);

      const result = await service.createApiKey({ name: 'Test' } as any, USER_ID, TENANT);
      expect(result.rawKey).toBeDefined();
      expect(result.rawKey).toMatch(/^cvk_[a-f0-9]{64}$/);
      expect(result.id).toBe('k1');
    });

    it('throws ConflictException if device already has a key', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ id: 'd1', tenantId: TENANT });
      prisma.iotApiKey.findUnique.mockResolvedValue({ id: 'k1' });

      await expect(
        service.createApiKey({ name: 'Test', deviceId: 'd1' } as any, USER_ID, TENANT),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── listApiKeys ─────────────────────────────────────

  describe('listApiKeys', () => {
    it('returns keys scoped to tenant', async () => {
      const keys = [{ id: 'k1', keyPrefix: 'cvk_abc' }];
      prisma.iotApiKey.findMany.mockResolvedValue(keys);

      const result = await service.listApiKeys(TENANT);
      expect(result).toEqual(keys);
      expect(prisma.iotApiKey.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: TENANT } }),
      );
    });
  });

  // ── revokeApiKey ────────────────────────────────────

  describe('revokeApiKey', () => {
    it('revokes an active key', async () => {
      prisma.iotApiKey.findUnique.mockResolvedValue({ id: 'k1', tenantId: TENANT });
      prisma.iotApiKey.update.mockResolvedValue({ id: 'k1', isActive: false });

      const result = await service.revokeApiKey('k1', USER_ID, TENANT);
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException if key not found', async () => {
      prisma.iotApiKey.findUnique.mockResolvedValue(null);
      await expect(service.revokeApiKey('k1', USER_ID, TENANT)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException if key belongs to different tenant', async () => {
      prisma.iotApiKey.findUnique.mockResolvedValue({ id: 'k1', tenantId: 'other' });
      await expect(service.revokeApiKey('k1', USER_ID, TENANT)).rejects.toThrow(NotFoundException);
    });
  });
});
