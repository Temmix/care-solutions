import { IotIngestionService } from '../src/modules/iot/iot-ingestion.service';

// ── Helpers ──────────────────────────────────────────────

const TENANT = 'tenant-1';

function makePrisma() {
  return {
    iotDevice: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    iotDeviceAssignment: {
      findFirst: jest.fn(),
    },
    vitalObservation: {
      create: jest.fn(),
    },
    userTenantMembership: {
      findMany: jest.fn(),
    },
  };
}

function makeVwService() {
  return {
    checkThresholdsForVital: jest.fn().mockResolvedValue(undefined),
  };
}

function makeEvents() {
  return {
    emitVirtualWardVitals: jest.fn(),
  };
}

function makeNotifications() {
  return {
    notify: jest.fn().mockResolvedValue(undefined),
  };
}

const DEVICE = {
  id: 'd1',
  serialNumber: 'OX-001',
  status: 'ACTIVE',
  tenantId: TENANT,
  batteryLevel: 90,
};

const ASSIGNMENT = {
  id: 'a1',
  deviceId: 'd1',
  enrolmentId: 'e1',
  isActive: true,
  enrolment: { id: 'e1', tenantId: TENANT },
};

const READING = {
  deviceSerialNumber: 'OX-001',
  vitalType: 'HEART_RATE',
  value: 72,
  unit: 'bpm',
};

// ── IotIngestionService ─────────────────────────────────

describe('IotIngestionService', () => {
  let service: IotIngestionService;
  let prisma: ReturnType<typeof makePrisma>;
  let vwService: ReturnType<typeof makeVwService>;
  let events: ReturnType<typeof makeEvents>;
  let notifications: ReturnType<typeof makeNotifications>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    vwService = makeVwService();
    events = makeEvents();
    notifications = makeNotifications();
    service = new IotIngestionService(
      prisma as any,
      vwService as any,
      events as any,
      notifications as any,
    );
  });

  // ── successful ingestion ────────────────────────────

  describe('successful ingestion', () => {
    beforeEach(() => {
      prisma.iotDevice.findUnique.mockResolvedValue(DEVICE);
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(ASSIGNMENT);
      prisma.iotDevice.update.mockResolvedValue({ ...DEVICE, lastSeenAt: new Date() });
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });
    });

    it('processes a single reading and returns ok result', async () => {
      const result = await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(result.processed).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toEqual({
        index: 0,
        status: 'ok',
        observationId: 'obs-1',
      });
    });

    it('creates VitalObservation with correct data', async () => {
      await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(prisma.vitalObservation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          enrolmentId: 'e1',
          vitalType: 'HEART_RATE',
          value: 72,
          unit: 'bpm',
          recorderId: null,
          deviceId: 'd1',
        }),
      });
    });

    it('updates device lastSeenAt and status to ACTIVE', async () => {
      await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(prisma.iotDevice.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          lastSeenAt: expect.any(Date),
        }),
      });
    });

    it('calls checkThresholdsForVital', async () => {
      await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(vwService.checkThresholdsForVital).toHaveBeenCalledWith(
        'e1',
        'HEART_RATE',
        72,
        TENANT,
      );
    });

    it('emits WebSocket event', async () => {
      await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(events.emitVirtualWardVitals).toHaveBeenCalledWith(
        TENANT,
        expect.objectContaining({
          enrolmentId: 'e1',
          observationId: 'obs-1',
          vitalType: 'HEART_RATE',
          value: 72,
        }),
      );
    });

    it('processes multiple readings in a batch', async () => {
      const readings = [
        READING,
        { ...READING, vitalType: 'OXYGEN_SATURATION', value: 97, unit: '%' },
      ];
      prisma.vitalObservation.create
        .mockResolvedValueOnce({ id: 'obs-1' })
        .mockResolvedValueOnce({ id: 'obs-2' });

      const result = await service.ingest({ readings } as any, TENANT, null);

      expect(result.processed).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].status).toBe('ok');
      expect(result.results[1].status).toBe('ok');
    });

    it('updates batteryLevel when provided', async () => {
      const reading = { ...READING, batteryLevel: 75 };
      await service.ingest({ readings: [reading] } as any, TENANT, null);

      expect(prisma.iotDevice.update).toHaveBeenCalledWith({
        where: { id: 'd1' },
        data: expect.objectContaining({ batteryLevel: 75 }),
      });
    });
  });

  // ── error handling ──────────────────────────────────

  describe('error handling', () => {
    it('returns error result when device not found', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(null);

      const result = await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(result.processed).toBe(0);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].error).toContain('Device not found');
    });

    it('returns error result when device is decommissioned', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue({ ...DEVICE, status: 'DECOMMISSIONED' });

      const result = await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(result.processed).toBe(0);
      expect(result.results[0].status).toBe('error');
      expect(result.results[0].error).toContain('decommissioned');
    });

    it('returns error when API key is scoped to a different device', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(DEVICE);

      const result = await service.ingest(
        { readings: [READING] } as any,
        TENANT,
        'different-device-id',
      );

      expect(result.processed).toBe(0);
      expect(result.results[0].error).toContain('scoped to a different device');
    });

    it('returns error when device has no active assignment', async () => {
      prisma.iotDevice.findUnique.mockResolvedValue(DEVICE);
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(null);

      const result = await service.ingest({ readings: [READING] } as any, TENANT, null);

      expect(result.processed).toBe(0);
      expect(result.results[0].error).toContain('no active assignment');
    });

    it('continues processing remaining readings after an error', async () => {
      // First reading: device not found. Second reading: success.
      prisma.iotDevice.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(DEVICE);
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(ASSIGNMENT);
      prisma.iotDevice.update.mockResolvedValue(DEVICE);
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-2' });

      const readings = [{ ...READING, deviceSerialNumber: 'MISSING-001' }, READING];
      const result = await service.ingest({ readings } as any, TENANT, null);

      expect(result.processed).toBe(1);
      expect(result.results[0].status).toBe('error');
      expect(result.results[1].status).toBe('ok');
    });
  });

  // ── low battery alert ───────────────────────────────

  describe('low battery alert', () => {
    beforeEach(() => {
      prisma.iotDevice.findUnique.mockResolvedValue(DEVICE);
      prisma.iotDeviceAssignment.findFirst.mockResolvedValue(ASSIGNMENT);
      prisma.iotDevice.update.mockResolvedValue(DEVICE);
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });
    });

    it('triggers notification when battery below 20%', async () => {
      prisma.userTenantMembership.findMany.mockResolvedValue([{ userId: 'admin-1' }]);
      const reading = { ...READING, batteryLevel: 10 };

      await service.ingest({ readings: [reading] } as any, TENANT, null);
      // Wait for fire-and-forget
      await new Promise((r) => setTimeout(r, 50));

      expect(prisma.userTenantMembership.findMany).toHaveBeenCalled();
      expect(notifications.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: 'DEVICE_BATTERY_LOW',
          title: 'Device Battery Low',
        }),
      );
    });

    it('does not trigger notification when battery is 20% or above', async () => {
      const reading = { ...READING, batteryLevel: 20 };

      await service.ingest({ readings: [reading] } as any, TENANT, null);
      await new Promise((r) => setTimeout(r, 50));

      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('does not trigger notification when batteryLevel is not provided', async () => {
      await service.ingest({ readings: [READING] } as any, TENANT, null);
      await new Promise((r) => setTimeout(r, 50));

      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });
});
