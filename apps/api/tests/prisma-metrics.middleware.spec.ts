import type { Prisma } from '@prisma/client';
import { setupPrismaMetricsMiddleware } from '../src/prisma/metrics.middleware';

describe('Prisma metrics middleware', () => {
  let registered: Prisma.Middleware | null;
  let prisma: { $use: jest.Mock };
  let metrics: {
    observePrismaQuery: jest.Mock;
    observePrismaQueryError: jest.Mock;
  };

  beforeEach(() => {
    registered = null;
    prisma = {
      $use: jest.fn((mw: Prisma.Middleware) => {
        registered = mw;
      }),
    };
    metrics = {
      observePrismaQuery: jest.fn(),
      observePrismaQueryError: jest.fn(),
    };
    setupPrismaMetricsMiddleware(prisma as any, metrics as any);
  });

  it('registers exactly one middleware function', () => {
    expect(prisma.$use).toHaveBeenCalledTimes(1);
    expect(registered).toBeInstanceOf(Function);
  });

  it('observes successful queries with model + action', async () => {
    const next = jest.fn().mockResolvedValue({ id: 'p1' });
    const params = { model: 'Patient', action: 'findUnique' } as any;
    const result = await registered!(params, next);
    expect(result).toEqual({ id: 'p1' });
    expect(metrics.observePrismaQuery).toHaveBeenCalledWith(
      'Patient',
      'findUnique',
      expect.any(Number),
    );
    expect(metrics.observePrismaQueryError).not.toHaveBeenCalled();
  });

  it('coerces null model to "raw" for raw queries', async () => {
    const next = jest.fn().mockResolvedValue([]);
    const params = { model: undefined, action: 'queryRaw' } as any;
    await registered!(params, next);
    expect(metrics.observePrismaQuery).toHaveBeenCalledWith('raw', 'queryRaw', expect.any(Number));
  });

  it('counts errors by class and rethrows', async () => {
    class PrismaClientKnownRequestError extends Error {
      code = 'P2002';
    }
    const err = new PrismaClientKnownRequestError('unique violation');
    const next = jest.fn().mockRejectedValue(err);
    const params = { model: 'Subscription', action: 'create' } as any;

    await expect(registered!(params, next)).rejects.toBe(err);

    expect(metrics.observePrismaQueryError).toHaveBeenCalledWith(
      'Subscription',
      'create',
      'PrismaClientKnownRequestError',
    );
    // Don't pollute the duration histogram with errored queries
    expect(metrics.observePrismaQuery).not.toHaveBeenCalled();
  });
});
