import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_LIMITS } from './plan-limits';
import type { SubscriptionTier, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class BillingService {
  private _stripe: Stripe | null = null;

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(ConfigService) private config: ConfigService,
  ) {}

  private get stripe(): Stripe {
    if (!this._stripe) {
      const apiKey = this.config.get<string>('STRIPE_SECRET_KEY');
      if (!apiKey) {
        throw new BadRequestException(
          'Payment processing is not configured. Please contact your system administrator.',
        );
      }
      this._stripe = new Stripe(apiKey);
    }
    return this._stripe;
  }

  // ── Subscription CRUD ───────────────────────────────────

  async getSubscription(organizationId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: { select: { name: true, stripeCustomerId: true } } },
    });

    // Lazy trial expiry: if trial has ended, downgrade to FREE
    if (sub && sub.status === 'TRIALING' && sub.trialEndsAt && new Date() > sub.trialEndsAt) {
      await this.expireTrial(organizationId);
      const org = sub.organization;
      const limits = PLAN_LIMITS.FREE;
      return {
        id: sub.id,
        organizationId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        patientLimit: limits.patientLimit,
        userLimit: limits.userLimit,
        limits,
        organization: org,
      };
    }

    if (!sub) {
      const org = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, stripeCustomerId: true },
      });

      if (!org) {
        throw new NotFoundException('Organisation not found. Please verify your account setup.');
      }

      const limits = PLAN_LIMITS.FREE;
      return {
        id: null,
        organizationId,
        tier: 'FREE',
        status: 'ACTIVE',
        stripeSubscriptionId: null,
        stripePriceId: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        trialEndsAt: null,
        patientLimit: limits.patientLimit,
        userLimit: limits.userLimit,
        limits,
        organization: org,
      };
    }

    const limits = PLAN_LIMITS[sub.tier] ?? PLAN_LIMITS.FREE;

    return {
      ...sub,
      limits,
    };
  }

  async getSubscriptionForTenant(tenantId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId: tenantId },
    });
    return sub;
  }

  private async expireTrial(organizationId: string): Promise<void> {
    const freeLimits = PLAN_LIMITS.FREE;
    await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        tier: 'FREE',
        status: 'ACTIVE',
        trialEndsAt: null,
        patientLimit: freeLimits.patientLimit,
        userLimit: freeLimits.userLimit,
      },
    });
  }

  // ── Stripe Customer ─────────────────────────────────────

  async getOrCreateStripeCustomer(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org)
      throw new NotFoundException('Organisation not found. Please verify your account setup.');

    if (org.stripeCustomerId) return org.stripeCustomerId;

    const customer = await this.stripe.customers.create({
      name: org.name,
      email: org.email ?? undefined,
      metadata: { organizationId: org.id },
    });

    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  // ── Checkout / Portal ───────────────────────────────────

  async createCheckoutSession(organizationId: string, priceId: string, returnUrl: string) {
    const customerId = await this.getOrCreateStripeCustomer(organizationId);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: returnUrl,
      metadata: { organizationId },
      subscription_data: {
        metadata: { organizationId },
      },
    });

    return { url: session.url };
  }

  async createPortalSession(organizationId: string, returnUrl: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org?.stripeCustomerId) {
      throw new BadRequestException(
        'No billing account found. Please subscribe to a plan to access billing features.',
      );
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  // ── Webhook handling ────────────────────────────────────

  constructWebhookEvent(body: Buffer, signature: string): Stripe.Event {
    const secret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    return this.stripe.webhooks.constructEvent(body, signature, secret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        // Ignore other events
        break;
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    if (!organizationId || !session.subscription) return;

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

    const stripeSub = await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.upsertSubscription(organizationId, stripeSub);
  }

  private async handleSubscriptionUpdate(stripeSub: Stripe.Subscription) {
    const organizationId = stripeSub.metadata?.organizationId;
    if (!organizationId) return;
    await this.upsertSubscription(organizationId, stripeSub);
  }

  private async handleSubscriptionDeleted(stripeSub: Stripe.Subscription) {
    const organizationId = stripeSub.metadata?.organizationId;
    if (!organizationId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSub.id },
      data: {
        status: 'CANCELED',
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async upsertSubscription(organizationId: string, stripeSub: Stripe.Subscription) {
    const firstItem = stripeSub.items.data[0];
    const priceId = firstItem?.price?.id ?? null;
    const tier = this.tierFromPriceId(priceId);
    const limits = PLAN_LIMITS[tier];
    const status = this.mapStripeStatus(stripeSub.status);

    // In Stripe v20+, period fields are on the subscription item
    const periodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000)
      : null;
    const periodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000)
      : null;

    const data = {
      tier: tier as SubscriptionTier,
      status,
      stripeSubscriptionId: stripeSub.id,
      stripePriceId: priceId,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      trialEndsAt: stripeSub.trial_end ? new Date(stripeSub.trial_end * 1000) : null,
      patientLimit: limits.patientLimit,
      userLimit: limits.userLimit,
    };

    await this.prisma.subscription.upsert({
      where: { organizationId },
      create: { organizationId, ...data },
      update: data,
    });
  }

  private tierFromPriceId(priceId: string | null): string {
    // Map Stripe Price IDs to tiers via env vars
    // STRIPE_PRICE_STARTER, STRIPE_PRICE_PROFESSIONAL, STRIPE_PRICE_ENTERPRISE
    if (!priceId) return 'FREE';

    const starterPrice = this.config.get<string>('STRIPE_PRICE_STARTER');
    const proPrice = this.config.get<string>('STRIPE_PRICE_PROFESSIONAL');
    const enterprisePrice = this.config.get<string>('STRIPE_PRICE_ENTERPRISE');

    if (priceId === starterPrice) return 'STARTER';
    if (priceId === proPrice) return 'PROFESSIONAL';
    if (priceId === enterprisePrice) return 'ENTERPRISE';

    return 'STARTER'; // default for unknown prices
  }

  private mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    const map: Record<string, SubscriptionStatus> = {
      trialing: 'TRIALING',
      active: 'ACTIVE',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'CANCELED',
      paused: 'CANCELED',
    };
    return map[status] ?? 'ACTIVE';
  }

  // ── All subscriptions (SUPER_ADMIN) ────────────────────

  async getAllSubscriptions(): Promise<Record<string, { tier: string; status: string }>> {
    const subs = await this.prisma.subscription.findMany({
      select: { organizationId: true, tier: true, status: true },
    });

    const map: Record<string, { tier: string; status: string }> = {};
    for (const sub of subs) {
      map[sub.organizationId] = { tier: sub.tier, status: sub.status };
    }
    return map;
  }

  // ── Plan listing (public) ──────────────────────────────

  getPlans() {
    return Object.entries(PLAN_LIMITS).map(([key, plan]) => ({
      tier: key,
      ...plan,
      priceId: this.config.get<string>(`STRIPE_PRICE_${key}`) ?? null,
    }));
  }
}
