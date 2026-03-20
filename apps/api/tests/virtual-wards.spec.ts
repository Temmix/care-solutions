import { NotFoundException, BadRequestException } from '@nestjs/common';
import { VirtualWardsService } from '../src/modules/virtual-wards/virtual-wards.service';
import { VirtualWardsController } from '../src/modules/virtual-wards/virtual-wards.controller';

// ── Helpers ──────────────────────────────────────────────

const TENANT = 'tenant-1';
const USER_ID = 'user-1';
const USER = { id: USER_ID, email: 'u@e.com', globalRole: 'CLINICIAN' };

function makePrisma() {
  return {
    virtualWardEnrolment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    monitoringProtocol: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vitalThreshold: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    vitalObservation: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    virtualWardAlert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    patientEvent: {
      create: jest.fn(),
    },
  };
}

function makeEvents() {
  return {
    emitVirtualWardAlert: jest.fn(),
  };
}

// ── VirtualWardsService ─────────────────────────────────

describe('VirtualWardsService', () => {
  let service: VirtualWardsService;
  let prisma: ReturnType<typeof makePrisma>;
  let events: ReturnType<typeof makeEvents>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    events = makeEvents();
    service = new VirtualWardsService(prisma as any, events as any);
  });

  // ── enrolPatient ────────────────────────────────────

  describe('enrolPatient', () => {
    const dto = { patientId: 'p1', encounterId: 'enc-1', clinicalSummary: 'Post-pneumonia' };

    it('creates an enrolment with ENROLLED status', async () => {
      const created = {
        id: 'vw-1',
        status: 'ENROLLED',
        patient: { givenName: 'John', familyName: 'Doe' },
      };
      prisma.virtualWardEnrolment.create.mockResolvedValue(created);
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.enrolPatient(dto as any, USER_ID, TENANT);

      expect(result).toEqual(created);
      expect(prisma.virtualWardEnrolment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ENROLLED',
            patientId: 'p1',
            encounterId: 'enc-1',
            enrollerId: USER_ID,
            tenantId: TENANT,
          }),
        }),
      );
      expect(prisma.patientEvent.create).toHaveBeenCalled();
    });
  });

  // ── searchEnrolments ────────────────────────────────

  describe('searchEnrolments', () => {
    it('returns paginated results', async () => {
      const data = [{ id: 'vw-1' }];
      prisma.virtualWardEnrolment.findMany.mockResolvedValue(data);
      prisma.virtualWardEnrolment.count.mockResolvedValue(1);

      const result = await service.searchEnrolments({ page: '1', limit: '20' } as any, TENANT);

      expect(result).toEqual({ data, total: 1, page: 1, limit: 20 });
    });

    it('filters by status when provided', async () => {
      prisma.virtualWardEnrolment.findMany.mockResolvedValue([]);
      prisma.virtualWardEnrolment.count.mockResolvedValue(0);

      await service.searchEnrolments({ status: 'MONITORING' } as any, TENANT);

      expect(prisma.virtualWardEnrolment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, status: 'MONITORING' },
        }),
      );
    });
  });

  // ── getDashboard ────────────────────────────────────

  describe('getDashboard', () => {
    it('returns aggregate stats', async () => {
      prisma.virtualWardEnrolment.count.mockResolvedValue(5);
      prisma.virtualWardAlert.count.mockResolvedValue(3);
      prisma.virtualWardAlert.groupBy.mockResolvedValue([
        { severity: 'HIGH', _count: 2 },
        { severity: 'MEDIUM', _count: 1 },
      ]);

      const result = await service.getDashboard(TENANT);

      expect(result).toEqual({
        enrolledCount: 5,
        openAlertCount: 3,
        alertsBySeverity: [
          { severity: 'HIGH', count: 2 },
          { severity: 'MEDIUM', count: 1 },
        ],
      });
    });
  });

  // ── getEnrolment ────────────────────────────────────

  describe('getEnrolment', () => {
    it('returns enrolment when found', async () => {
      const enrolment = { id: 'vw-1', tenantId: TENANT };
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue(enrolment);

      const result = await service.getEnrolment('vw-1', TENANT);
      expect(result).toEqual(enrolment);
    });

    it('throws when not found', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue(null);

      await expect(service.getEnrolment('nope', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('throws when tenant mismatch', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: 'other',
      });

      await expect(service.getEnrolment('vw-1', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  // ── createProtocol ──────────────────────────────────

  describe('createProtocol', () => {
    it('creates a protocol with thresholds', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      const protocol = { id: 'proto-1', vitalType: 'HEART_RATE', thresholds: [] };
      prisma.monitoringProtocol.create.mockResolvedValue(protocol);

      const dto = {
        vitalType: 'HEART_RATE',
        frequencyHours: 6,
        thresholds: [{ maxValue: 120, severity: 'HIGH' }],
      };

      const result = await service.createProtocol('vw-1', dto as any, TENANT);

      expect(result).toEqual(protocol);
      expect(prisma.monitoringProtocol.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enrolmentId: 'vw-1',
            vitalType: 'HEART_RATE',
            frequencyHours: 6,
          }),
        }),
      );
    });
  });

  // ── updateProtocol ──────────────────────────────────

  describe('updateProtocol', () => {
    it('updates protocol and replaces thresholds', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.monitoringProtocol.findUnique.mockResolvedValue({
        id: 'proto-1',
        enrolmentId: 'vw-1',
        frequencyHours: 6,
        isActive: true,
      });
      prisma.vitalThreshold.deleteMany.mockResolvedValue({});
      prisma.vitalThreshold.createMany.mockResolvedValue({});
      prisma.monitoringProtocol.update.mockResolvedValue({ id: 'proto-1' });

      await service.updateProtocol(
        'vw-1',
        'proto-1',
        { thresholds: [{ maxValue: 100, severity: 'LOW' }], frequencyHours: 4 } as any,
        TENANT,
      );

      expect(prisma.vitalThreshold.deleteMany).toHaveBeenCalledWith({
        where: { protocolId: 'proto-1' },
      });
      expect(prisma.vitalThreshold.createMany).toHaveBeenCalled();
      expect(prisma.monitoringProtocol.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ frequencyHours: 4 }),
        }),
      );
    });

    it('throws when protocol not found', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.monitoringProtocol.findUnique.mockResolvedValue(null);

      await expect(service.updateProtocol('vw-1', 'nope', {} as any, TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── deleteProtocol ──────────────────────────────────

  describe('deleteProtocol', () => {
    it('deletes a protocol', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.monitoringProtocol.findUnique.mockResolvedValue({
        id: 'proto-1',
        enrolmentId: 'vw-1',
      });
      prisma.monitoringProtocol.delete.mockResolvedValue({});

      const result = await service.deleteProtocol('vw-1', 'proto-1', TENANT);
      expect(result).toEqual({ deleted: true });
    });
  });

  // ── recordObservation + threshold auto-alert ────────

  describe('recordObservation', () => {
    it('records an observation and checks thresholds', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        patientId: 'p1',
        enrollerId: USER_ID,
      });
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });
      // No active protocols — no alerts
      prisma.monitoringProtocol.findMany.mockResolvedValue([]);

      const dto = { vitalType: 'HEART_RATE', value: 75, unit: 'bpm' };
      const result = await service.recordObservation('vw-1', dto as any, USER_ID, TENANT);

      expect(result).toEqual({ id: 'obs-1' });
      expect(prisma.vitalObservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enrolmentId: 'vw-1',
            vitalType: 'HEART_RATE',
            value: 75,
          }),
        }),
      );
    });

    it('generates alert when threshold is breached', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        patientId: 'p1',
        enrollerId: USER_ID,
      });
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });

      // Active protocol with threshold
      prisma.monitoringProtocol.findMany.mockResolvedValue([
        {
          id: 'proto-1',
          thresholds: [{ minValue: null, maxValue: 100, severity: 'HIGH' }],
        },
      ]);
      const alert = { id: 'alert-1', severity: 'HIGH', message: 'test' };
      prisma.virtualWardAlert.create.mockResolvedValue(alert);
      prisma.patientEvent.create.mockResolvedValue({});

      const dto = { vitalType: 'HEART_RATE', value: 130, unit: 'bpm' };
      await service.recordObservation('vw-1', dto as any, USER_ID, TENANT);

      expect(prisma.virtualWardAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enrolmentId: 'vw-1',
            severity: 'HIGH',
            triggerValue: 130,
          }),
        }),
      );
      expect(events.emitVirtualWardAlert).toHaveBeenCalledWith(TENANT, {
        enrolmentId: 'vw-1',
        alertId: 'alert-1',
        severity: 'HIGH',
        message: 'test',
      });
    });

    it('does not generate alert when within thresholds', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        patientId: 'p1',
        enrollerId: USER_ID,
      });
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });
      prisma.monitoringProtocol.findMany.mockResolvedValue([
        {
          id: 'proto-1',
          thresholds: [{ minValue: null, maxValue: 100, severity: 'HIGH' }],
        },
      ]);

      const dto = { vitalType: 'HEART_RATE', value: 80, unit: 'bpm' };
      await service.recordObservation('vw-1', dto as any, USER_ID, TENANT);

      expect(prisma.virtualWardAlert.create).not.toHaveBeenCalled();
    });

    it('triggers alert when value falls below minValue threshold', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        patientId: 'p1',
        enrollerId: USER_ID,
      });
      prisma.vitalObservation.create.mockResolvedValue({ id: 'obs-1' });
      prisma.monitoringProtocol.findMany.mockResolvedValue([
        {
          id: 'proto-1',
          thresholds: [{ minValue: 90, maxValue: null, severity: 'CRITICAL' }],
        },
      ]);
      prisma.virtualWardAlert.create.mockResolvedValue({
        id: 'alert-1',
        severity: 'CRITICAL',
        message: 'below 90',
      });
      prisma.patientEvent.create.mockResolvedValue({});

      const dto = { vitalType: 'OXYGEN_SATURATION', value: 85, unit: '%' };
      await service.recordObservation('vw-1', dto as any, USER_ID, TENANT);

      expect(prisma.virtualWardAlert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ severity: 'CRITICAL', triggerValue: 85 }),
        }),
      );
    });
  });

  // ── Alert management ────────────────────────────────

  describe('acknowledgeAlert', () => {
    it('acknowledges an OPEN alert', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.virtualWardAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        enrolmentId: 'vw-1',
        status: 'OPEN',
      });
      prisma.virtualWardAlert.update.mockResolvedValue({ status: 'ACKNOWLEDGED' });

      const result = await service.acknowledgeAlert('vw-1', 'alert-1', USER_ID, TENANT);
      expect(result.status).toBe('ACKNOWLEDGED');
    });

    it('rejects acknowledging a non-OPEN alert', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.virtualWardAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        enrolmentId: 'vw-1',
        status: 'RESOLVED',
      });

      await expect(service.acknowledgeAlert('vw-1', 'alert-1', USER_ID, TENANT)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('escalateAlert', () => {
    it('escalates an open alert and updates enrolment status', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.virtualWardAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        enrolmentId: 'vw-1',
        status: 'OPEN',
      });
      prisma.virtualWardAlert.update.mockResolvedValue({ status: 'ESCALATED' });
      prisma.virtualWardEnrolment.update.mockResolvedValue({});

      const result = await service.escalateAlert('vw-1', 'alert-1', 'doc-1', USER_ID, TENANT);

      expect(result.status).toBe('ESCALATED');
      expect(prisma.virtualWardEnrolment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'ESCALATED' },
        }),
      );
    });

    it('rejects escalating a resolved alert', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.virtualWardAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        enrolmentId: 'vw-1',
        status: 'RESOLVED',
      });

      await expect(
        service.escalateAlert('vw-1', 'alert-1', 'doc-1', USER_ID, TENANT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveAlert', () => {
    it('resolves an alert', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
      });
      prisma.virtualWardAlert.findUnique.mockResolvedValue({
        id: 'alert-1',
        enrolmentId: 'vw-1',
        status: 'ACKNOWLEDGED',
      });
      prisma.virtualWardAlert.update.mockResolvedValue({ status: 'RESOLVED' });

      const result = await service.resolveAlert('vw-1', 'alert-1', 'Fixed', USER_ID, TENANT);
      expect(result.status).toBe('RESOLVED');
    });
  });

  // ── discharge ───────────────────────────────────────

  describe('discharge', () => {
    it('discharges an active enrolment', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        status: 'MONITORING',
        patientId: 'p1',
        clinicalSummary: 'old',
      });
      prisma.virtualWardEnrolment.update.mockResolvedValue({ status: 'DISCHARGED' });
      prisma.patientEvent.create.mockResolvedValue({});

      const dto = { dischargeReason: 'Stable', clinicalSummary: 'All good' };
      const result = await service.discharge('vw-1', dto as any, USER_ID, TENANT);

      expect(result.status).toBe('DISCHARGED');
      expect(prisma.virtualWardEnrolment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'DISCHARGED',
            dischargeReason: 'Stable',
            dischargerId: USER_ID,
          }),
        }),
      );
      expect(prisma.patientEvent.create).toHaveBeenCalled();
    });

    it('rejects discharging an already discharged enrolment', async () => {
      prisma.virtualWardEnrolment.findUnique.mockResolvedValue({
        id: 'vw-1',
        tenantId: TENANT,
        status: 'DISCHARGED',
      });

      await expect(
        service.discharge('vw-1', { dischargeReason: 'test' } as any, USER_ID, TENANT),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

// ── VirtualWardsController ──────────────────────────────

describe('VirtualWardsController', () => {
  let controller: VirtualWardsController;
  let vwService: {
    enrolPatient: jest.Mock;
    searchEnrolments: jest.Mock;
    getDashboard: jest.Mock;
    getEnrolment: jest.Mock;
    createProtocol: jest.Mock;
    updateProtocol: jest.Mock;
    deleteProtocol: jest.Mock;
    recordObservation: jest.Mock;
    getObservations: jest.Mock;
    getAlerts: jest.Mock;
    acknowledgeAlert: jest.Mock;
    escalateAlert: jest.Mock;
    resolveAlert: jest.Mock;
    discharge: jest.Mock;
  };

  beforeEach(() => {
    vwService = {
      enrolPatient: jest.fn(),
      searchEnrolments: jest.fn(),
      getDashboard: jest.fn(),
      getEnrolment: jest.fn(),
      createProtocol: jest.fn(),
      updateProtocol: jest.fn(),
      deleteProtocol: jest.fn(),
      recordObservation: jest.fn(),
      getObservations: jest.fn(),
      getAlerts: jest.fn(),
      acknowledgeAlert: jest.fn(),
      escalateAlert: jest.fn(),
      resolveAlert: jest.fn(),
      discharge: jest.fn(),
    };

    controller = new VirtualWardsController(vwService as any);
  });

  it('enrol delegates to vwService.enrolPatient', async () => {
    const dto = { patientId: 'p1', encounterId: 'enc-1' };
    vwService.enrolPatient.mockResolvedValue({ id: 'vw-1' });

    const result = await controller.enrol(dto as any, USER, TENANT);

    expect(vwService.enrolPatient).toHaveBeenCalledWith(dto, USER_ID, TENANT);
    expect(result).toEqual({ id: 'vw-1' });
  });

  it('search delegates with dto and tenantId', async () => {
    const dto = { page: '1' };
    vwService.searchEnrolments.mockResolvedValue({ data: [], total: 0 });

    await controller.search(dto as any, TENANT);

    expect(vwService.searchEnrolments).toHaveBeenCalledWith(dto, TENANT);
  });

  it('getDashboard delegates with tenantId', async () => {
    vwService.getDashboard.mockResolvedValue({ enrolledCount: 5 });

    await controller.dashboard(TENANT);

    expect(vwService.getDashboard).toHaveBeenCalledWith(TENANT);
  });

  it('getEnrolment delegates with id and tenantId', async () => {
    vwService.getEnrolment.mockResolvedValue({ id: 'vw-1' });

    await controller.getEnrolment('vw-1', TENANT);

    expect(vwService.getEnrolment).toHaveBeenCalledWith('vw-1', TENANT);
  });

  it('createProtocol delegates correctly', async () => {
    const dto = { vitalType: 'HEART_RATE', frequencyHours: 6, thresholds: [] };
    vwService.createProtocol.mockResolvedValue({});

    await controller.createProtocol('vw-1', dto as any, TENANT);

    expect(vwService.createProtocol).toHaveBeenCalledWith('vw-1', dto, TENANT);
  });

  it('recordObservation delegates with correct args', async () => {
    const dto = { vitalType: 'HEART_RATE', value: 80, unit: 'bpm' };
    vwService.recordObservation.mockResolvedValue({});

    await controller.recordObservation('vw-1', dto as any, USER, TENANT);

    expect(vwService.recordObservation).toHaveBeenCalledWith('vw-1', dto, USER_ID, TENANT);
  });

  it('acknowledgeAlert delegates correctly', async () => {
    vwService.acknowledgeAlert.mockResolvedValue({});

    await controller.acknowledgeAlert('vw-1', 'alert-1', USER, TENANT);

    expect(vwService.acknowledgeAlert).toHaveBeenCalledWith('vw-1', 'alert-1', USER_ID, TENANT);
  });

  it('discharge delegates correctly', async () => {
    const dto = { dischargeReason: 'Stable' };
    vwService.discharge.mockResolvedValue({});

    await controller.discharge('vw-1', dto as any, USER, TENANT);

    expect(vwService.discharge).toHaveBeenCalledWith('vw-1', dto, USER_ID, TENANT);
  });

  it('deleteProtocol delegates correctly', async () => {
    vwService.deleteProtocol.mockResolvedValue({ deleted: true });

    await controller.deleteProtocol('vw-1', 'proto-1', TENANT);

    expect(vwService.deleteProtocol).toHaveBeenCalledWith('vw-1', 'proto-1', TENANT);
  });

  it('escalateAlert delegates with escalatedToId from body', async () => {
    vwService.escalateAlert.mockResolvedValue({});

    await controller.escalateAlert(
      'vw-1',
      'alert-1',
      { escalatedToId: 'doc-1' } as any,
      USER,
      TENANT,
    );

    expect(vwService.escalateAlert).toHaveBeenCalledWith(
      'vw-1',
      'alert-1',
      'doc-1',
      USER_ID,
      TENANT,
    );
  });

  it('resolveAlert delegates with resolveNotes from body', async () => {
    vwService.resolveAlert.mockResolvedValue({});

    await controller.resolveAlert(
      'vw-1',
      'alert-1',
      { resolveNotes: 'All clear' } as any,
      USER,
      TENANT,
    );

    expect(vwService.resolveAlert).toHaveBeenCalledWith(
      'vw-1',
      'alert-1',
      'All clear',
      USER_ID,
      TENANT,
    );
  });
});
