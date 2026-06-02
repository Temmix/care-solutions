import { NotFoundException } from '@nestjs/common';
import { SubProcessorsService } from '../src/modules/sub-processors/sub-processors.service';

const DAY = 24 * 60 * 60 * 1000;
const ACTOR = 'admin-1';

const buildConfig = (values: Record<string, string> = {}) => ({
  get: jest.fn((k: string) => values[k]),
});

const buildPrisma = () => ({
  subProcessor: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn(),
    create: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: 'sp1', status: 'ACTIVE', ...data }),
      ),
    update: jest
      .fn()
      .mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'sp1',
          name: 'Acme',
          status: 'ACTIVE',
          effectiveDate: new Date(),
          ...data,
        }),
      ),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('SubProcessorsService', () => {
  const build = (prisma: ReturnType<typeof buildPrisma>, cfg: Record<string, string> = {}) =>
    new SubProcessorsService(prisma as never, buildConfig(cfg) as never);

  it('lists current sub-processors (active+effective or pending removal)', async () => {
    const prisma = buildPrisma();
    await build(prisma).listCurrent();
    const where = prisma.subProcessor.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { status: 'ACTIVE', effectiveDate: { lte: expect.any(Date) } },
      { status: 'REMOVED', effectiveDate: { gt: expect.any(Date) } },
    ]);
  });

  it('lists the changes feed (upcoming or recently announced)', async () => {
    const prisma = buildPrisma();
    await build(prisma).listChanges();
    const where = prisma.subProcessor.findMany.mock.calls[0][0].where;
    expect(where.OR[0]).toEqual({ effectiveDate: { gt: expect.any(Date) } });
    expect(where.OR[1].announcedAt.gte).toBeInstanceOf(Date);
  });

  it('defaults the effective date to now + 30-day notice when creating', async () => {
    const prisma = buildPrisma();
    const before = Date.now();
    await build(prisma).create({ name: 'Acme', purpose: 'Email', location: 'EU' } as never, ACTOR);
    const data = prisma.subProcessor.create.mock.calls[0][0].data;
    expect(data.effectiveDate.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY - 5000);
    expect(data.createdById).toBe(ACTOR);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CREATE_SUBPROCESSOR', resource: 'SubProcessor' }),
    });
  });

  it('honours a custom notice period', async () => {
    const prisma = buildPrisma();
    const before = Date.now();
    await build(prisma, { SUB_PROCESSOR_NOTICE_DAYS: '60' }).create(
      { name: 'Acme', purpose: 'x', location: 'EU' } as never,
      ACTOR,
    );
    const data = prisma.subProcessor.create.mock.calls[0][0].data;
    expect(data.effectiveDate.getTime()).toBeGreaterThanOrEqual(before + 60 * DAY - 5000);
  });

  it('throws NotFound updating a missing sub-processor', async () => {
    const prisma = buildPrisma();
    prisma.subProcessor.findUnique.mockResolvedValue(null);
    await expect(build(prisma).update('nope', {} as never, ACTOR)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('starts the notice clock when a removal is announced without a date', async () => {
    const prisma = buildPrisma();
    prisma.subProcessor.findUnique.mockResolvedValue({ id: 'sp1', status: 'ACTIVE' });
    const before = Date.now();
    await build(prisma).update('sp1', { status: 'REMOVED' } as never, ACTOR);
    const data = prisma.subProcessor.update.mock.calls[0][0].data;
    expect(data.status).toBe('REMOVED');
    expect(data.effectiveDate.getTime()).toBeGreaterThanOrEqual(before + 30 * DAY - 5000);
    expect(data.announcedAt).toBeInstanceOf(Date);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'UPDATE_SUBPROCESSOR' }),
    });
  });
});
