import { NotFoundException } from '@nestjs/common';
import { IncidentsService } from '../src/modules/incidents/incidents.service';

const TENANT = 'tenant-1';
const ACTOR = 'user-1';
const DAY = 24 * 60 * 60 * 1000;

const baseRow = (over: Record<string, unknown> = {}) => ({
  id: 'inc1',
  reference: 'INC-ABCD1234',
  title: 'Lost laptop',
  description: 'A device went missing',
  category: 'LOST_OR_STOLEN_DEVICE',
  severity: 'HIGH',
  status: 'OPEN',
  affectedDataSubjects: null,
  occurredAt: null,
  discoveredAt: new Date(),
  containedAt: null,
  resolvedAt: null,
  icoReportable: false,
  icoReportedAt: null,
  reportedById: ACTOR,
  assignedToId: null,
  tenantId: TENANT,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const buildPrisma = () => ({
  securityIncident: {
    create: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(baseRow({ ...data, discoveredAt: data.discoveredAt ?? new Date() })),
      ),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn(),
    update: jest
      .fn()
      .mockImplementation(
        ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
          Promise.resolve(baseRow({ id: where.id, ...data })),
      ),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('IncidentsService', () => {
  const build = (prisma: ReturnType<typeof buildPrisma>) => new IncidentsService(prisma as never);

  it('creates an incident with a generated reference, reporter, and audit entry', async () => {
    const prisma = buildPrisma();
    const service = build(prisma);

    const result = await service.create(
      {
        title: 'Lost laptop',
        description: 'x',
        category: 'LOST_OR_STOLEN_DEVICE',
        severity: 'HIGH',
      } as never,
      ACTOR,
      TENANT,
    );

    const createArg = prisma.securityIncident.create.mock.calls[0][0].data;
    expect(createArg.reference).toMatch(/^INC-/);
    expect(createArg.reportedById).toBe(ACTOR);
    expect(createArg.tenantId).toBe(TENANT);
    expect(result.icoReportDeadline).toBeInstanceOf(Date);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CREATE_INCIDENT', resource: 'SecurityIncident' }),
    });
  });

  it('throws NotFound for an incident outside the tenant', async () => {
    const prisma = buildPrisma();
    prisma.securityIncident.findFirst.mockResolvedValue(null);
    await expect(build(prisma).get('nope', TENANT)).rejects.toThrow(NotFoundException);
  });

  it('flags ICO report overdue when reportable, unreported, >72h old and not closed', async () => {
    const prisma = buildPrisma();
    prisma.securityIncident.findFirst.mockResolvedValue(
      baseRow({
        discoveredAt: new Date(Date.now() - 4 * DAY),
        icoReportable: true,
        icoReportedAt: null,
      }),
    );
    const view = await build(prisma).get('inc1', TENANT);
    expect(view.icoReportOverdue).toBe(true);
  });

  it('does not flag overdue once the ICO report is recorded', async () => {
    const prisma = buildPrisma();
    prisma.securityIncident.findFirst.mockResolvedValue(
      baseRow({
        discoveredAt: new Date(Date.now() - 4 * DAY),
        icoReportable: true,
        icoReportedAt: new Date(),
      }),
    );
    const view = await build(prisma).get('inc1', TENANT);
    expect(view.icoReportOverdue).toBe(false);
  });

  it('stamps resolvedAt on transition to RESOLVED and audits the update', async () => {
    const prisma = buildPrisma();
    prisma.securityIncident.findFirst.mockResolvedValue(baseRow({ status: 'INVESTIGATING' }));
    await build(prisma).update('inc1', { status: 'RESOLVED' } as never, ACTOR, TENANT);

    const data = prisma.securityIncident.update.mock.calls[0][0].data;
    expect(data.status).toBe('RESOLVED');
    expect(data.resolvedAt).toBeInstanceOf(Date);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'UPDATE_INCIDENT' }),
    });
  });

  it('records the ICO notification time when marked reported', async () => {
    const prisma = buildPrisma();
    prisma.securityIncident.findFirst.mockResolvedValue(baseRow({ icoReportedAt: null }));
    await build(prisma).update('inc1', { icoReported: true } as never, ACTOR, TENANT);

    const data = prisma.securityIncident.update.mock.calls[0][0].data;
    expect(data.icoReportedAt).toBeInstanceOf(Date);
    expect(data.icoReportable).toBe(true);
  });
});
