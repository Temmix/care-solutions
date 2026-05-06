import { NotFoundException, BadRequestException } from '@nestjs/common';

// Mock Stripe before importing BillingService
jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      customers: { create: jest.fn() },
      checkout: { sessions: { create: jest.fn() } },
      billingPortal: { sessions: { create: jest.fn() } },
      subscriptions: { retrieve: jest.fn() },
      webhooks: { constructEvent: jest.fn() },
    })),
  };
});

import { BillingService } from '../src/modules/billing/billing.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: {
    subscription: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
      findMany: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    processedStripeEvent: {
      create: jest.Mock;
    };
  };
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      processedStripeEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    configService = {
      get: jest.fn().mockReturnValue(''),
      getOrThrow: jest.fn().mockReturnValue('whsec_test'),
    };

    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new BillingService(
      prisma as any,
      configService as any,
      {
        notify: jest.fn().mockResolvedValue(undefined),
        notifyMany: jest.fn().mockResolvedValue(undefined),
      } as any,
      audit as any,
    );
  });

  describe('getSubscription', () => {
    it('returns subscription with plan limits', async () => {
      const sub = {
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'STARTER',
        status: 'ACTIVE',
        organization: { name: 'Test Org', stripeCustomerId: null },
      };
      prisma.subscription.findUnique.mockResolvedValue(sub);

      const result = await service.getSubscription('org-1');

      expect(result.tier).toBe('STARTER');
      expect(result.limits.patientLimit).toBe(200);
      expect(result.limits.userLimit).toBe(20);
      expect(result.limits.priceMonthlyGBP).toBe(59);
    });

    it('throws NotFoundException when no subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.getSubscription('org-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSubscriptionForTenant', () => {
    it('returns subscription or null', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscriptionForTenant('org-1');
      expect(result).toBeNull();
    });
  });

  describe('getOrCreateStripeCustomer', () => {
    it('returns existing stripeCustomerId', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test',
        stripeCustomerId: 'cus_existing',
      });

      const result = await service.getOrCreateStripeCustomer('org-1');
      expect(result).toBe('cus_existing');
    });

    it('throws NotFoundException for unknown org', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getOrCreateStripeCustomer('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPortalSession', () => {
    it('throws when no stripe customer', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        stripeCustomerId: null,
      });

      await expect(
        service.createPortalSession('org-1', 'http://localhost/billing'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlans', () => {
    it('returns all plan tiers with config', () => {
      const plans = service.getPlans();

      expect(plans).toHaveLength(4);
      expect(plans.map((p) => p.tier)).toEqual(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']);
      expect(plans[0].priceMonthlyGBP).toBe(0);
      expect(plans[1].priceMonthlyGBP).toBe(59);
      expect(plans[2].priceMonthlyGBP).toBe(99);
      expect(plans[3].priceMonthlyGBP).toBe(299);
    });
  });

  // ── Webhook idempotency (B1) ────────────────────────────

  describe('handleWebhookEvent', () => {
    const buildEvent = (id = 'evt_123', type = 'customer.subscription.updated') =>
      ({
        id,
        type,
        data: {
          object: {
            id: 'sub_1',
            metadata: { organizationId: 'org-1' },
            items: {
              data: [{ price: { id: 'price_x' }, current_period_start: 0, current_period_end: 0 }],
            },
            status: 'active',
            cancel_at_period_end: false,
            trial_end: null,
          },
        },
      }) as any;

    it('returns deduplicated:true on duplicate event id', async () => {
      const dupErr = Object.assign(new Error('unique violation'), { code: 'P2002' });
      prisma.processedStripeEvent.create.mockRejectedValueOnce(dupErr);

      const result = await service.handleWebhookEvent(buildEvent());

      expect(result.deduplicated).toBe(true);
      expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    });

    it('processes event and returns deduplicated:false on first delivery', async () => {
      prisma.processedStripeEvent.create.mockResolvedValueOnce({});
      prisma.subscription.upsert.mockResolvedValueOnce({});

      const result = await service.handleWebhookEvent(buildEvent());

      expect(result.deduplicated).toBe(false);
      expect(prisma.processedStripeEvent.create).toHaveBeenCalledWith({
        data: { id: 'evt_123', type: 'customer.subscription.updated' },
      });
    });

    it('rethrows non-P2002 prisma errors so Stripe retries', async () => {
      const dbErr = Object.assign(new Error('connection failed'), { code: 'P1001' });
      prisma.processedStripeEvent.create.mockRejectedValueOnce(dbErr);

      await expect(service.handleWebhookEvent(buildEvent())).rejects.toThrow('connection failed');
    });
  });

  // ── Mode validation (B2) ────────────────────────────────

  describe('onModuleInit', () => {
    const make = (envVars: Record<string, string | undefined>) => {
      const cfg = {
        get: jest.fn((k: string) => envVars[k]),
        getOrThrow: jest.fn(),
      };
      return new BillingService(
        prisma as any,
        cfg as any,
        {
          notify: jest.fn(),
          notifyMany: jest.fn(),
        } as any,
        { log: jest.fn() } as any,
      );
    };

    it('passes for sk_live with STRIPE_MODE=live', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_live_abc', STRIPE_MODE: 'live' });
      expect(() => svc.onModuleInit()).not.toThrow();
    });

    it('passes for sk_test with STRIPE_MODE unset (defaults to test)', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_test_abc' });
      expect(() => svc.onModuleInit()).not.toThrow();
    });

    it('passes for sk_test with NODE_ENV=production but STRIPE_MODE not set (staging case)', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_test_abc', NODE_ENV: 'production' });
      expect(() => svc.onModuleInit()).not.toThrow();
    });

    it('throws when STRIPE_MODE=live but key is sk_test_*', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_MODE: 'live' });
      expect(() => svc.onModuleInit()).toThrow(/STRIPE_MODE=live but STRIPE_SECRET_KEY is sk_test/);
    });

    it('throws when STRIPE_MODE=test but key is sk_live_* (prevents accidental live charges)', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_live_abc', STRIPE_MODE: 'test' });
      expect(() => svc.onModuleInit()).toThrow(/STRIPE_MODE=test but STRIPE_SECRET_KEY is sk_live/);
    });

    it('throws on unexpected key prefix', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'rk_live_restricted' });
      expect(() => svc.onModuleInit()).toThrow(/unexpected prefix/);
    });

    it('throws on unexpected STRIPE_MODE value', () => {
      const svc = make({ STRIPE_SECRET_KEY: 'sk_test_abc', STRIPE_MODE: 'sandbox' });
      expect(() => svc.onModuleInit()).toThrow(/STRIPE_MODE has unexpected value/);
    });

    it('no-ops if key is unset (e.g. local dev without billing)', () => {
      const svc = make({ STRIPE_SECRET_KEY: undefined });
      expect(() => svc.onModuleInit()).not.toThrow();
    });
  });

  // ── Trial admin (SUPER_ADMIN) ───────────────────────────

  describe('listTrials', () => {
    it('returns trials with daysRemaining computed', async () => {
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      prisma.subscription.findMany.mockResolvedValue([
        {
          organizationId: 'org-1',
          tier: 'PROFESSIONAL',
          status: 'TRIALING',
          trialEndsAt: inSevenDays,
          createdAt: new Date(),
          organization: { id: 'org-1', name: 'Test', type: 'CARE_HOME' },
        },
      ]);
      const result = await service.listTrials();
      expect(result).toHaveLength(1);
      expect(result[0].daysRemaining).toBe(7);
    });
  });

  describe('extendTrial', () => {
    it('extends an active trial and writes audit log', async () => {
      const trialEndsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt,
      });
      prisma.subscription.update.mockResolvedValue({
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt: new Date(trialEndsAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      });

      await service.extendTrial('org-1', 7, 'admin-1', 'sales request');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-1' },
          data: expect.objectContaining({ status: 'TRIALING' }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'TRIAL_EXTENDED',
          resource: 'Subscription',
          tenantId: 'org-1',
          metadata: expect.objectContaining({ additionalDays: 7, reason: 'sales request' }),
        }),
      );
    });

    it('re-opens an already-expired trial from now', async () => {
      const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'FREE',
        status: 'ACTIVE',
        trialEndsAt: past,
      });
      prisma.subscription.update.mockResolvedValue({
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt: new Date(),
      });

      await service.extendTrial('org-1', 14, 'admin-1');

      const updateCall = prisma.subscription.update.mock.calls[0][0];
      const newEndsAt = updateCall.data.trialEndsAt as Date;
      // Should be ~14 days from now, not 14 days from past
      const fourteenDaysFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;
      expect(Math.abs(newEndsAt.getTime() - fourteenDaysFromNow)).toBeLessThan(60_000);
    });

    it('throws NotFoundException for unknown organization', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      await expect(service.extendTrial('nope', 7, 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelTrialAdmin', () => {
    it('cancels a TRIALING subscription and writes audit log', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt: new Date(),
      });
      prisma.subscription.update.mockResolvedValue({});
      // expireTrial calls userTenantMembership.findMany internally
      (prisma as any).userTenantMembership = {
        findMany: jest.fn().mockResolvedValue([]),
      };

      await service.cancelTrialAdmin('org-1', 'admin-1', 'abuse');

      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRIAL_CANCELED',
          metadata: expect.objectContaining({ reason: 'abuse' }),
        }),
      );
    });

    it('rejects when subscription is not TRIALING', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'STARTER',
        status: 'ACTIVE',
        trialEndsAt: null,
      });
      await expect(service.cancelTrialAdmin('org-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('grantTrial', () => {
    it('grants a new trial to a FREE tenant', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'FREE',
        status: 'ACTIVE',
        trialEndsAt: null,
        stripeSubscriptionId: null,
      });
      prisma.subscription.update.mockResolvedValue({
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt: new Date(),
      });

      await service.grantTrial('org-1', 30, 'admin-1', 'win-back');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'PROFESSIONAL', status: 'TRIALING' }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRIAL_GRANTED',
          metadata: expect.objectContaining({ durationDays: 30, reason: 'win-back' }),
        }),
      );
    });

    it('rejects when tenant has active Stripe subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'STARTER',
        status: 'ACTIVE',
        stripeSubscriptionId: 'sub_stripe_123',
      });
      await expect(service.grantTrial('org-1', undefined, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects when tenant is already TRIALING', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        stripeSubscriptionId: null,
      });
      await expect(service.grantTrial('org-1', undefined, 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('uses default TRIAL_DURATION_DAYS when durationDays is undefined', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'FREE',
        status: 'ACTIVE',
        stripeSubscriptionId: null,
      });
      prisma.subscription.update.mockResolvedValue({});

      await service.grantTrial('org-1', undefined, 'admin-1');

      const updateCall = prisma.subscription.update.mock.calls[0][0];
      const newEndsAt = updateCall.data.trialEndsAt as Date;
      const sixtyDaysFromNow = Date.now() + 60 * 24 * 60 * 60 * 1000;
      expect(Math.abs(newEndsAt.getTime() - sixtyDaysFromNow)).toBeLessThan(60_000);
    });
  });

  // ── Notification tests ──────────────────────────────────

  describe('trial expiry notification', () => {
    it('should notify org admins when trial expires via lazy check', async () => {
      const notif = {
        notify: jest.fn().mockResolvedValue(undefined),
        notifyMany: jest.fn().mockResolvedValue(undefined),
      };
      const trialSub = {
        id: 'sub-1',
        organizationId: 'org-1',
        tier: 'PROFESSIONAL',
        status: 'TRIALING',
        trialEndsAt: new Date(Date.now() - 1000), // expired
        organization: { name: 'Test Org', stripeCustomerId: null },
      };

      const billingPrisma = {
        ...prisma,
        subscription: {
          ...prisma.subscription,
          findUnique: jest.fn().mockResolvedValue(trialSub),
          update: jest.fn().mockResolvedValue({}),
        },
        userTenantMembership: {
          findMany: jest.fn().mockResolvedValue([{ userId: 'admin-1' }, { userId: 'admin-2' }]),
        },
      };

      const svc = new BillingService(
        billingPrisma as any,
        configService as any,
        notif as any,
        { log: jest.fn() } as any,
      );

      await svc.getSubscription('org-1');

      // Trial expired → expireTrial called → notifyOrgAdmins called
      expect(billingPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tier: 'FREE', status: 'ACTIVE' }),
        }),
      );
      expect(notif.notifyMany).toHaveBeenCalledWith(
        ['admin-1', 'admin-2'],
        expect.objectContaining({
          tenantId: 'org-1',
          type: 'SUBSCRIPTION_CHANGED',
          title: 'Trial Ended',
        }),
      );
    });
  });
});
