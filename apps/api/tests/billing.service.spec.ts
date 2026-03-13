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
      updateMany: jest.Mock;
    };
    organization: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let configService: { get: jest.Mock; getOrThrow: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    prisma = {
      subscription: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        updateMany: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    configService = {
      get: jest.fn().mockReturnValue(''),
      getOrThrow: jest.fn().mockReturnValue('whsec_test'),
    };

    service = new BillingService(prisma as any, configService as any);
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
      expect(result.limits.patientLimit).toBe(50);
      expect(result.limits.userLimit).toBe(10);
      expect(result.limits.priceMonthlyGBP).toBe(39);
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
      expect(plans[1].priceMonthlyGBP).toBe(39);
      expect(plans[2].priceMonthlyGBP).toBe(99);
      expect(plans[3].priceMonthlyGBP).toBe(299);
    });
  });
});
