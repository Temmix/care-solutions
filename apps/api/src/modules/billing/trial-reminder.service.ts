import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MetricsService } from '../metrics/metrics.service';

const REMINDER_BUCKETS = [7, 3, 1] as const;

@Injectable()
export class TrialReminderService {
  private readonly logger = new Logger(TrialReminderService.name);

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(NotificationsService) private notifications: NotificationsService,
    @Inject(MetricsService) private metrics: MetricsService,
  ) {}

  // Daily at 08:00 Europe/London. Idempotent within a day via lastTrialReminderDay.
  @Cron('0 8 * * *', { name: 'trial-reminders', timeZone: 'Europe/London' })
  async runDaily(): Promise<void> {
    for (const days of REMINDER_BUCKETS) {
      await this.processBucket(days);
    }
    // Heartbeat for the cron-stale alert. Only set on full run completion.
    this.metrics.setTrialReminderLastRun(Date.now() / 1000);
  }

  /** Send TRIAL_EXPIRING notifications for trials that hit the given days-remaining bucket today. */
  async processBucket(daysRemaining: number): Promise<number> {
    const now = new Date();
    const bucketStart = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
    bucketStart.setHours(0, 0, 0, 0);
    const bucketEnd = new Date(bucketStart.getTime() + 24 * 60 * 60 * 1000);

    const subs = await this.prisma.subscription.findMany({
      where: {
        status: 'TRIALING',
        trialEndsAt: { gte: bucketStart, lt: bucketEnd },
        OR: [{ lastTrialReminderDay: null }, { lastTrialReminderDay: { not: daysRemaining } }],
      },
      select: { id: true, organizationId: true, trialEndsAt: true },
    });

    if (subs.length === 0) return 0;

    let sent = 0;
    for (const sub of subs) {
      try {
        await this.notifyOrgAdmins(sub.organizationId, daysRemaining, sub.trialEndsAt!);
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: { lastTrialReminderDay: daysRemaining },
        });
        sent++;
        this.metrics.observeTrialReminderRun(daysRemaining, 'success');
      } catch (e) {
        this.metrics.observeTrialReminderRun(daysRemaining, 'failed');
        this.logger.error(
          `Failed to send ${daysRemaining}d trial reminder for org ${sub.organizationId}: ${(e as Error).message}`,
        );
      }
    }
    this.logger.log(`Sent ${sent}/${subs.length} ${daysRemaining}-day trial reminders`);
    return sent;
  }

  private async notifyOrgAdmins(
    organizationId: string,
    daysRemaining: number,
    trialEndsAt: Date,
  ): Promise<void> {
    const admins = await this.prisma.userTenantMembership.findMany({
      where: { organizationId, status: 'ACTIVE', role: { in: ['ADMIN', 'TENANT_ADMIN'] } },
      select: { userId: true },
    });
    const userIds = admins.map((a) => a.userId);
    if (userIds.length === 0) return;

    const dayWord = daysRemaining === 1 ? 'day' : 'days';
    await this.notifications.notifyMany(userIds, {
      tenantId: organizationId,
      type: 'TRIAL_EXPIRING',
      title: `Your trial ends in ${daysRemaining} ${dayWord}`,
      message: `Your Professional trial ends on ${trialEndsAt.toLocaleDateString('en-GB')}. Subscribe before then to keep full access.`,
      link: '/app/billing',
    });
  }
}
