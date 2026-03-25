import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isWithinLimit, PLAN_LIMITS } from './plan-limits';

export interface TrialInfo {
  active: boolean;
  endsAt: string;
  daysRemaining: number;
}

export interface UsageInfo {
  users: { current: number; limit: number };
  patients: { current: number; limit: number };
  tier: string;
  trial?: TrialInfo;
}

@Injectable()
export class SubscriptionLimitService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  /**
   * Returns the effective limits for a tenant.
   * Uses the subscription record's stored limits (which Stripe webhooks update),
   * falling back to PLAN_LIMITS for the tier if limits are missing.
   */
  private async getLimits(
    tenantId: string,
  ): Promise<{ userLimit: number; patientLimit: number; tier: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId: tenantId },
    });

    if (!subscription) {
      const free = PLAN_LIMITS.FREE;
      return { userLimit: free.userLimit, patientLimit: free.patientLimit, tier: 'FREE' };
    }

    // Lazy trial expiry: enforce FREE limits immediately if trial has ended
    if (
      subscription.status === 'TRIALING' &&
      subscription.trialEndsAt &&
      new Date() > subscription.trialEndsAt
    ) {
      const free = PLAN_LIMITS.FREE;
      return { userLimit: free.userLimit, patientLimit: free.patientLimit, tier: 'FREE' };
    }

    return {
      userLimit: subscription.userLimit,
      patientLimit: subscription.patientLimit,
      tier: subscription.tier,
    };
  }

  /** Count active members belonging to a tenant (via membership table) */
  private async countUsers(tenantId: string): Promise<number> {
    return this.prisma.userTenantMembership.count({
      where: { organizationId: tenantId, status: 'ACTIVE' },
    });
  }

  /** Count active patients belonging to a tenant */
  private async countPatients(tenantId: string): Promise<number> {
    return this.prisma.patient.count({
      where: { tenantId, active: true },
    });
  }

  /**
   * Check if the tenant can add another user.
   * Throws ForbiddenException if at or over limit.
   */
  async enforceUserLimit(tenantId: string): Promise<void> {
    const { userLimit, tier } = await this.getLimits(tenantId);
    const currentCount = await this.countUsers(tenantId);

    if (!isWithinLimit(currentCount, userLimit)) {
      const planLabel = PLAN_LIMITS[tier]?.label ?? tier;
      throw new ForbiddenException(
        `User limit reached (${currentCount}/${userLimit}). Your ${planLabel} plan allows up to ${userLimit} users. Please upgrade your subscription.`,
      );
    }
  }

  /**
   * Check if the tenant can add another patient.
   * Throws ForbiddenException if at or over limit.
   */
  async enforcePatientLimit(tenantId: string): Promise<void> {
    const { patientLimit, tier } = await this.getLimits(tenantId);
    const currentCount = await this.countPatients(tenantId);

    if (!isWithinLimit(currentCount, patientLimit)) {
      const planLabel = PLAN_LIMITS[tier]?.label ?? tier;
      throw new ForbiddenException(
        `Patient limit reached (${currentCount}/${patientLimit}). Your ${planLabel} plan allows up to ${patientLimit} patients. Please upgrade your subscription.`,
      );
    }
  }

  /**
   * Returns current usage counts and limits for a tenant.
   * Used by the billing/usage endpoint so the frontend can display progress bars.
   */
  async getUsage(tenantId: string): Promise<UsageInfo> {
    const [limits, userCount, patientCount, subscription] = await Promise.all([
      this.getLimits(tenantId),
      this.countUsers(tenantId),
      this.countPatients(tenantId),
      this.prisma.subscription.findUnique({
        where: { organizationId: tenantId },
        select: { status: true, trialEndsAt: true },
      }),
    ]);

    let trial: TrialInfo | undefined;
    if (subscription?.status === 'TRIALING' && subscription.trialEndsAt) {
      const now = new Date();
      const daysRemaining = Math.max(
        0,
        Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
      trial = {
        active: now < subscription.trialEndsAt,
        endsAt: subscription.trialEndsAt.toISOString(),
        daysRemaining,
      };
    }

    return {
      users: { current: userCount, limit: limits.userLimit },
      patients: { current: patientCount, limit: limits.patientLimit },
      tier: limits.tier,
      trial,
    };
  }
}
