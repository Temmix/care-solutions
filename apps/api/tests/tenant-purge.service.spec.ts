import { TenantPurgeService } from '../src/modules/tenant-purge/tenant-purge.service';

const DAY = 24 * 60 * 60 * 1000;

const buildConfig = (values: Record<string, string> = {}) => ({
  get: jest.fn((k: string) => values[k]),
});

const buildPrisma = () => ({
  organization: {
    updateMany: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  },
  patient: {
    count: jest.fn().mockResolvedValue(5),
    deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
  },
  encounter: {
    count: jest.fn().mockResolvedValue(2),
    deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
  },
  chcCase: {
    count: jest.fn().mockResolvedValue(1),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  virtualWardEnrolment: {
    count: jest.fn().mockResolvedValue(0),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
  $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
});

const TENANT = 'org-1';
const ELIGIBLE = { id: TENANT, terminatedAt: new Date(Date.now() - 40 * DAY), dataPurgedAt: null };
const ENABLED = { TENANT_PURGE_ENABLED: 'true' };

describe('TenantPurgeService', () => {
  describe('reconcileTerminations', () => {
    it('stamps newly terminated tenants and clears reactivated ones', async () => {
      const prisma = buildPrisma();
      prisma.organization.updateMany
        .mockResolvedValueOnce({ count: 2 }) // stamp
        .mockResolvedValueOnce({ count: 1 }); // clear
      const service = new TenantPurgeService(prisma as never, buildConfig() as never);

      const result = await service.reconcileTerminations();

      expect(result).toEqual({ stamped: 2, cleared: 1 });
      // First call stamps terminatedAt on terminated subs; second clears on reactivation.
      expect(prisma.organization.updateMany.mock.calls[0][0].data).toHaveProperty('terminatedAt');
      expect(prisma.organization.updateMany.mock.calls[1][0].data).toEqual({ terminatedAt: null });
    });
  });

  describe('listPurgeCandidates', () => {
    it('returns tenants past the 30-day grace window with computed purge-due date', async () => {
      const prisma = buildPrisma();
      const terminatedAt = new Date(Date.now() - 40 * DAY);
      prisma.organization.findMany.mockResolvedValue([
        { id: 'org-1', name: 'Old Care Ltd', terminatedAt },
      ]);
      const service = new TenantPurgeService(prisma as never, buildConfig() as never);

      const candidates = await service.listPurgeCandidates();

      expect(candidates).toHaveLength(1);
      expect(candidates[0].tenantId).toBe('org-1');
      expect(candidates[0].purgeDueAt.getTime()).toBe(terminatedAt.getTime() + 30 * DAY);
      expect(candidates[0].daysSinceDue).toBeGreaterThanOrEqual(9); // 40 - 30, minus rounding

      // Query filters to terminated tenants older than the cutoff.
      const where = prisma.organization.findMany.mock.calls[0][0].where;
      expect(where.terminatedAt.not).toBeNull();
      expect(where.terminatedAt.lt).toBeInstanceOf(Date);
    });

    it('honours a custom grace window', async () => {
      const prisma = buildPrisma();
      const terminatedAt = new Date(Date.now() - 100 * DAY);
      prisma.organization.findMany.mockResolvedValue([{ id: 'o', name: 'n', terminatedAt }]);
      const service = new TenantPurgeService(
        prisma as never,
        buildConfig({ TENANT_DATA_GRACE_DAYS: '90' }) as never,
      );

      const [c] = await service.listPurgeCandidates();
      expect(c.purgeDueAt.getTime()).toBe(terminatedAt.getTime() + 90 * DAY);
    });
  });

  describe('executePurge', () => {
    const run = (prisma: ReturnType<typeof buildPrisma>, cfg: Record<string, string> = ENABLED) =>
      new TenantPurgeService(prisma as never, buildConfig(cfg) as never);

    it('refuses when the feature flag is off', async () => {
      const prisma = buildPrisma();
      await expect(
        run(prisma, {}).executePurge(TENANT, TENANT, 'r', 'admin', false),
      ).rejects.toThrow(/disabled/i);
      expect(prisma.organization.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a tenant that is not terminated', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue({
        id: TENANT,
        terminatedAt: null,
        dataPurgedAt: null,
      });
      await expect(run(prisma).executePurge(TENANT, TENANT, 'r', 'admin', false)).rejects.toThrow(
        /not terminated/i,
      );
    });

    it('rejects while still inside the grace window', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue({
        id: TENANT,
        terminatedAt: new Date(Date.now() - 5 * DAY),
        dataPurgedAt: null,
      });
      await expect(run(prisma).executePurge(TENANT, TENANT, 'r', 'admin', false)).rejects.toThrow(
        /grace window/i,
      );
    });

    it('rejects an already-purged tenant', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue({ ...ELIGIBLE, dataPurgedAt: new Date() });
      await expect(run(prisma).executePurge(TENANT, TENANT, 'r', 'admin', false)).rejects.toThrow(
        /already been purged/i,
      );
    });

    it('rejects a confirmation token that does not match', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue(ELIGIBLE);
      await expect(run(prisma).executePurge(TENANT, 'wrong', 'r', 'admin', false)).rejects.toThrow(
        /confirmation/i,
      );
      expect(prisma.patient.deleteMany).not.toHaveBeenCalled();
    });

    it('dry-run returns counts without deleting', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue(ELIGIBLE);

      const result = await run(prisma).executePurge(TENANT, TENANT, 'DSAR', 'admin', true);

      expect(result.dryRun).toBe(true);
      expect(result.purgedAt).toBeNull();
      expect(result.counts).toEqual({
        patients: 5,
        encounters: 2,
        chcCases: 1,
        virtualWardEnrolments: 0,
      });
      expect(prisma.patient.deleteMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'PURGE_TENANT_DRY_RUN' }),
      });
    });

    it('executes the cascade-ordered deletion and marks the tenant purged', async () => {
      const prisma = buildPrisma();
      prisma.organization.findUnique.mockResolvedValue(ELIGIBLE);

      const result = await run(prisma).executePurge(TENANT, TENANT, 'DSAR', 'admin', false);

      const scope = { where: { tenantId: TENANT } };
      expect(prisma.virtualWardEnrolment.deleteMany).toHaveBeenCalledWith(scope);
      expect(prisma.chcCase.deleteMany).toHaveBeenCalledWith(scope);
      expect(prisma.encounter.deleteMany).toHaveBeenCalledWith(scope);
      expect(prisma.patient.deleteMany).toHaveBeenCalledWith(scope);
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: TENANT },
        data: { dataPurgedAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result.dryRun).toBe(false);
      expect(result.purgedAt).toBeInstanceOf(Date);
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: 'PURGE_TENANT' }),
      });
    });
  });
});
