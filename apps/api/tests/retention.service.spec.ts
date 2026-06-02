import { RetentionService } from '../src/modules/retention/retention.service';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const buildConfig = (values: Record<string, string>) => ({
  get: jest.fn((key: string) => values[key]),
});

const buildPrisma = () => ({
  auditLog: { deleteMany: jest.fn().mockResolvedValue({ count: 7 }) },
});

describe('RetentionService.purgeExpiredAuditLogs', () => {
  it('does nothing when RETENTION_ENABLED is not "true"', async () => {
    const prisma = buildPrisma();
    const service = new RetentionService(prisma as never, buildConfig({}) as never);

    const result = await service.purgeExpiredAuditLogs();

    expect(result).toEqual({ enabled: false, deleted: 0, cutoff: null });
    expect(prisma.auditLog.deleteMany).not.toHaveBeenCalled();
  });

  it('purges audit logs older than the default 3 years (1095 days) when enabled', async () => {
    const prisma = buildPrisma();
    const service = new RetentionService(
      prisma as never,
      buildConfig({ RETENTION_ENABLED: 'true' }) as never,
    );

    const before = Date.now();
    const result = await service.purgeExpiredAuditLogs();
    const after = Date.now();

    expect(result.enabled).toBe(true);
    expect(result.deleted).toBe(7);

    const arg = prisma.auditLog.deleteMany.mock.calls[0][0];
    const cutoff = (arg.where.createdAt.lt as Date).getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before - 1095 * MS_PER_DAY - 5000);
    expect(cutoff).toBeLessThanOrEqual(after - 1095 * MS_PER_DAY + 5000);
  });

  it('honours a custom AUDIT_LOG_RETENTION_DAYS', async () => {
    const prisma = buildPrisma();
    const service = new RetentionService(
      prisma as never,
      buildConfig({ RETENTION_ENABLED: 'true', AUDIT_LOG_RETENTION_DAYS: '30' }) as never,
    );

    const before = Date.now();
    await service.purgeExpiredAuditLogs();

    const cutoff = (
      prisma.auditLog.deleteMany.mock.calls[0][0].where.createdAt.lt as Date
    ).getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before - 30 * MS_PER_DAY - 5000);
    expect(cutoff).toBeLessThanOrEqual(before - 30 * MS_PER_DAY + 5000);
  });

  it('falls back to the default when AUDIT_LOG_RETENTION_DAYS is invalid', async () => {
    const prisma = buildPrisma();
    const service = new RetentionService(
      prisma as never,
      buildConfig({ RETENTION_ENABLED: 'true', AUDIT_LOG_RETENTION_DAYS: 'not-a-number' }) as never,
    );

    const before = Date.now();
    await service.purgeExpiredAuditLogs();

    const cutoff = (
      prisma.auditLog.deleteMany.mock.calls[0][0].where.createdAt.lt as Date
    ).getTime();
    // ~3 years, not ~0 days
    expect(cutoff).toBeLessThanOrEqual(before - 1000 * MS_PER_DAY);
  });
});
