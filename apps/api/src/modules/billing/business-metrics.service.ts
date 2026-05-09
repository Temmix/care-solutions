import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';

/**
 * Polls the database every minute to refresh subscription + trial gauges.
 *
 * Why polling instead of incrementing on every event: gauges in Prometheus
 * model "current value" rather than "rate of change". Recomputing from the
 * source-of-truth (the DB) every minute keeps the gauges correct even when
 * subscriptions change via Stripe webhooks, trial expiry, manual admin
 * actions, or DB migrations — all paths converge on the next poll.
 *
 * One DB read per minute is cheap (single GROUP BY on a small table).
 */
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(MetricsService) private metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'business-metrics-poll' })
  async poll(): Promise<void> {
    try {
      await Promise.all([this.pollSubscriptions(), this.pollTrials()]);
    } catch (e) {
      // Don't crash the cron loop on a transient DB blip — next minute will retry.
      this.logger.error(`Business metrics poll failed: ${(e as Error).message}`);
    }
  }

  /** Sets `clinvara_subscriptions_active{tier,status}` from a single GROUP BY. */
  async pollSubscriptions(): Promise<void> {
    const rows = await this.prisma.subscription.groupBy({
      by: ['tier', 'status'],
      _count: { _all: true },
    });

    this.metrics.resetSubscriptionsActive();
    for (const row of rows) {
      this.metrics.setSubscriptionsActive(row.tier, row.status, row._count._all);
    }
  }

  /**
   * Sets `clinvara_trials_active{bucket}` based on remaining-days windows.
   * Buckets are deliberately coarse (low cardinality, easy to alert on).
   */
  async pollTrials(): Promise<void> {
    const trials = await this.prisma.subscription.findMany({
      where: { status: 'TRIALING' },
      select: { trialEndsAt: true },
    });

    const buckets = { 'gt-30d': 0, '8-30d': 0, '4-7d': 0, '1-3d': 0, 'expiring-today': 0 };
    const now = Date.now();
    for (const t of trials) {
      if (!t.trialEndsAt) continue;
      const days = Math.ceil((t.trialEndsAt.getTime() - now) / (1000 * 60 * 60 * 24));
      if (days > 30) buckets['gt-30d']++;
      else if (days >= 8) buckets['8-30d']++;
      else if (days >= 4) buckets['4-7d']++;
      else if (days >= 1) buckets['1-3d']++;
      else buckets['expiring-today']++;
    }

    this.metrics.resetTrialsActive();
    for (const [bucket, count] of Object.entries(buckets)) {
      this.metrics.setTrialsActive(bucket, count);
    }
  }
}
