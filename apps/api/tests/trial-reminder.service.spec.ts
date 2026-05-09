import { TrialReminderService } from '../src/modules/billing/trial-reminder.service';

describe('TrialReminderService', () => {
  let service: TrialReminderService;
  let prisma: {
    subscription: { findMany: jest.Mock; update: jest.Mock };
    userTenantMembership: { findMany: jest.Mock };
  };
  let notifications: { notifyMany: jest.Mock };
  let metrics: {
    observeTrialReminderRun: jest.Mock;
    setTrialReminderLastRun: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      subscription: { findMany: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      userTenantMembership: { findMany: jest.fn() },
    };
    notifications = { notifyMany: jest.fn().mockResolvedValue(undefined) };
    metrics = {
      observeTrialReminderRun: jest.fn(),
      setTrialReminderLastRun: jest.fn(),
    };
    service = new TrialReminderService(prisma as any, notifications as any, metrics as any);
  });

  describe('processBucket', () => {
    it('returns 0 and skips notifications when no trials are in the bucket', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      const sent = await service.processBucket(7);
      expect(sent).toBe(0);
      expect(notifications.notifyMany).not.toHaveBeenCalled();
    });

    it('queries with the exact day-bucket window and dedup filter', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      await service.processBucket(3);

      const where = (prisma.subscription.findMany.mock.calls[0][0] as any).where;
      expect(where.status).toBe('TRIALING');
      expect(where.trialEndsAt.gte).toBeInstanceOf(Date);
      expect(where.trialEndsAt.lt).toBeInstanceOf(Date);
      // 24h window
      const span = where.trialEndsAt.lt.getTime() - where.trialEndsAt.gte.getTime();
      expect(span).toBe(24 * 60 * 60 * 1000);
      // The OR clause skips trials already reminded for this bucket
      expect(where.OR).toEqual([
        { lastTrialReminderDay: null },
        { lastTrialReminderDay: { not: 3 } },
      ]);
    });

    it('notifies admins and marks lastTrialReminderDay for each match', async () => {
      const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', organizationId: 'org-1', trialEndsAt },
      ]);
      prisma.userTenantMembership.findMany.mockResolvedValue([
        { userId: 'admin-1' },
        { userId: 'admin-2' },
      ]);

      const sent = await service.processBucket(7);

      expect(sent).toBe(1);
      expect(notifications.notifyMany).toHaveBeenCalledWith(
        ['admin-1', 'admin-2'],
        expect.objectContaining({
          tenantId: 'org-1',
          type: 'TRIAL_EXPIRING',
          link: '/app/billing',
        }),
      );
      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { lastTrialReminderDay: 7 },
      });
    });

    it('uses singular "day" for 1-day reminders', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', organizationId: 'org-1', trialEndsAt: new Date() },
      ]);
      prisma.userTenantMembership.findMany.mockResolvedValue([{ userId: 'admin-1' }]);

      await service.processBucket(1);

      const callArg = notifications.notifyMany.mock.calls[0][1];
      expect(callArg.title).toContain('1 day');
      expect(callArg.title).not.toContain('1 days');
    });

    it('continues processing remaining trials when one fails', async () => {
      const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', organizationId: 'org-1', trialEndsAt },
        { id: 'sub-2', organizationId: 'org-2', trialEndsAt },
      ]);
      prisma.userTenantMembership.findMany.mockResolvedValue([{ userId: 'admin-1' }]);
      notifications.notifyMany
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValueOnce(undefined);

      const sent = await service.processBucket(3);

      expect(sent).toBe(1);
      // Both findMany were attempted (org-1 fails, org-2 succeeds)
      expect(notifications.notifyMany).toHaveBeenCalledTimes(2);
    });

    it('skips orgs with no admins', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 'sub-1', organizationId: 'org-1', trialEndsAt: new Date() },
      ]);
      prisma.userTenantMembership.findMany.mockResolvedValue([]);

      const sent = await service.processBucket(7);

      // Still counts as "sent" since the bucket was processed without error
      expect(sent).toBe(1);
      expect(notifications.notifyMany).not.toHaveBeenCalled();
    });
  });

  describe('runDaily', () => {
    it('processes all three buckets (7, 3, 1)', async () => {
      prisma.subscription.findMany.mockResolvedValue([]);
      await service.runDaily();
      expect(prisma.subscription.findMany).toHaveBeenCalledTimes(3);
    });
  });
});
