import { BusinessMetricsService } from '../src/modules/billing/business-metrics.service';

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;
  let prisma: {
    subscription: { groupBy: jest.Mock; findMany: jest.Mock };
  };
  let metrics: {
    setSubscriptionsActive: jest.Mock;
    resetSubscriptionsActive: jest.Mock;
    setTrialsActive: jest.Mock;
    resetTrialsActive: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      subscription: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
      },
    };
    metrics = {
      setSubscriptionsActive: jest.fn(),
      resetSubscriptionsActive: jest.fn(),
      setTrialsActive: jest.fn(),
      resetTrialsActive: jest.fn(),
    };
    service = new BusinessMetricsService(prisma as any, metrics as any);
  });

  describe('pollSubscriptions', () => {
    it('groups by tier+status and sets a gauge per row', async () => {
      prisma.subscription.groupBy.mockResolvedValue([
        { tier: 'STARTER', status: 'ACTIVE', _count: { _all: 5 } },
        { tier: 'PROFESSIONAL', status: 'ACTIVE', _count: { _all: 12 } },
        { tier: 'PROFESSIONAL', status: 'TRIALING', _count: { _all: 3 } },
        { tier: 'FREE', status: 'CANCELED', _count: { _all: 1 } },
      ]);

      await service.pollSubscriptions();

      expect(metrics.resetSubscriptionsActive).toHaveBeenCalledTimes(1);
      expect(metrics.setSubscriptionsActive).toHaveBeenCalledWith('STARTER', 'ACTIVE', 5);
      expect(metrics.setSubscriptionsActive).toHaveBeenCalledWith('PROFESSIONAL', 'ACTIVE', 12);
      expect(metrics.setSubscriptionsActive).toHaveBeenCalledWith('PROFESSIONAL', 'TRIALING', 3);
      expect(metrics.setSubscriptionsActive).toHaveBeenCalledWith('FREE', 'CANCELED', 1);
    });

    it('handles empty result without errors', async () => {
      prisma.subscription.groupBy.mockResolvedValue([]);
      await service.pollSubscriptions();
      expect(metrics.resetSubscriptionsActive).toHaveBeenCalled();
      expect(metrics.setSubscriptionsActive).not.toHaveBeenCalled();
    });
  });

  describe('pollTrials', () => {
    const day = 24 * 60 * 60 * 1000;

    it('buckets trials by remaining days', async () => {
      const now = Date.now();
      prisma.subscription.findMany.mockResolvedValue([
        { trialEndsAt: new Date(now + 45 * day) }, // gt-30d
        { trialEndsAt: new Date(now + 31 * day) }, // gt-30d
        { trialEndsAt: new Date(now + 15 * day) }, // 8-30d
        { trialEndsAt: new Date(now + 5 * day) }, //  4-7d
        { trialEndsAt: new Date(now + 2 * day) }, //  1-3d
        { trialEndsAt: new Date(now - day) }, //      expiring-today (days <= 0)
      ]);

      await service.pollTrials();

      expect(metrics.resetTrialsActive).toHaveBeenCalledTimes(1);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('gt-30d', 2);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('8-30d', 1);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('4-7d', 1);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('1-3d', 1);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('expiring-today', 1);
    });

    it('skips subscriptions with null trialEndsAt', async () => {
      prisma.subscription.findMany.mockResolvedValue([{ trialEndsAt: null }]);
      await service.pollTrials();
      // All buckets at zero
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('gt-30d', 0);
      expect(metrics.setTrialsActive).toHaveBeenCalledWith('expiring-today', 0);
    });
  });

  describe('poll', () => {
    it('runs both pollers in parallel', async () => {
      prisma.subscription.groupBy.mockResolvedValue([]);
      prisma.subscription.findMany.mockResolvedValue([]);
      await service.poll();
      expect(prisma.subscription.groupBy).toHaveBeenCalled();
      expect(prisma.subscription.findMany).toHaveBeenCalled();
    });

    it('catches errors so the cron loop keeps running', async () => {
      prisma.subscription.groupBy.mockRejectedValue(new Error('db down'));
      prisma.subscription.findMany.mockResolvedValue([]);
      await expect(service.poll()).resolves.toBeUndefined();
    });
  });
});
