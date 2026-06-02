import { TenantPurgeService } from '../src/modules/tenant-purge/tenant-purge.service';

const DAY = 24 * 60 * 60 * 1000;

const buildConfig = (values: Record<string, string> = {}) => ({
  get: jest.fn((k: string) => values[k]),
});

const buildPrisma = () => ({
  organization: {
    updateMany: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
});

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
});
