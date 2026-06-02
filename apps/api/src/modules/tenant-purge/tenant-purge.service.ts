import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_GRACE_DAYS = 30; // DPA: 30-day post-termination export window
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TERMINATED_STATUSES = ['CANCELED', 'UNPAID'] as const;
const ACTIVE_STATUSES = ['ACTIVE', 'TRIALING'] as const;

export interface PurgeCandidate {
  tenantId: string;
  name: string;
  terminatedAt: Date;
  purgeDueAt: Date;
  daysSinceDue: number;
}

/**
 * Phase 1 of terminated-tenant data retention: tracks when a tenant's
 * subscription is terminated and reports which tenants are past the grace
 * window and therefore eligible for a data purge.
 *
 * This service performs NO deletion — it only stamps/clears `terminatedAt`
 * (non-destructive) and surfaces candidates. The actual hard-delete is a
 * separate, SUPER_ADMIN-confirmed, opt-in operation (Phase 2).
 */
@Injectable()
export class TenantPurgeService {
  private readonly logger = new Logger(TenantPurgeService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  // Daily at 02:30 Europe/London, before other retention jobs.
  @Cron('30 2 * * *', { name: 'tenant-termination-reconcile', timeZone: 'Europe/London' })
  async runDaily(): Promise<void> {
    const { stamped, cleared } = await this.reconcileTerminations();
    const candidates = await this.listPurgeCandidates();
    this.logger.log(
      `Tenant retention: ${stamped} newly terminated, ${cleared} reactivated, ` +
        `${candidates.length} past the ${this.graceDays()}-day grace window (awaiting purge confirmation)`,
    );
  }

  /**
   * Stamp `terminatedAt` on tenants whose subscription is terminated, and clear
   * it on any that have been reactivated. Non-destructive and idempotent.
   */
  async reconcileTerminations(): Promise<{ stamped: number; cleared: number }> {
    const [stamped, cleared] = await Promise.all([
      this.prisma.organization.updateMany({
        where: {
          terminatedAt: null,
          subscription: { is: { status: { in: [...TERMINATED_STATUSES] } } },
        },
        data: { terminatedAt: new Date() },
      }),
      this.prisma.organization.updateMany({
        where: {
          terminatedAt: { not: null },
          subscription: { is: { status: { in: [...ACTIVE_STATUSES] } } },
        },
        data: { terminatedAt: null },
      }),
    ]);
    return { stamped: stamped.count, cleared: cleared.count };
  }

  /** Tenants whose termination is older than the grace window. */
  async listPurgeCandidates(): Promise<PurgeCandidate[]> {
    const graceMs = this.graceDays() * MS_PER_DAY;
    const cutoff = new Date(Date.now() - graceMs);

    const orgs = await this.prisma.organization.findMany({
      where: { terminatedAt: { not: null, lt: cutoff } },
      select: { id: true, name: true, terminatedAt: true },
      orderBy: { terminatedAt: 'asc' },
    });

    return orgs.map((o) => {
      const terminatedAt = o.terminatedAt as Date;
      const purgeDueAt = new Date(terminatedAt.getTime() + graceMs);
      return {
        tenantId: o.id,
        name: o.name,
        terminatedAt,
        purgeDueAt,
        daysSinceDue: Math.floor((Date.now() - purgeDueAt.getTime()) / MS_PER_DAY),
      };
    });
  }

  private graceDays(): number {
    const raw = this.config.get<string>('TENANT_DATA_GRACE_DAYS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GRACE_DAYS;
  }
}
