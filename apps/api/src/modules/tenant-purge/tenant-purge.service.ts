import {
  Injectable,
  Inject,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
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

export interface PurgeResult {
  tenantId: string;
  dryRun: boolean;
  counts: { patients: number; encounters: number; chcCases: number; virtualWardEnrolments: number };
  purgedAt: Date | null;
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

  /**
   * Hard-delete a terminated tenant's patient Customer Data (Phase 2).
   *
   * Four explicit gates: feature flag (TENANT_PURGE_ENABLED), eligibility
   * (terminated + past grace), typed confirmation (the tenant id) and a reason.
   * `dryRun` returns what WOULD be deleted without deleting. Deletion relies on
   * the schema's cascades: removing enrolments, CHC cases and encounters first
   * (their patient FKs don't cascade), then patients (which cascades the rest).
   * Idempotent via dataPurgedAt.
   */
  async executePurge(
    tenantId: string,
    confirmation: string,
    reason: string,
    actorId: string,
    dryRun: boolean,
  ): Promise<PurgeResult> {
    if (this.config.get<string>('TENANT_PURGE_ENABLED') !== 'true') {
      throw new ForbiddenException('Tenant data purge is disabled (TENANT_PURGE_ENABLED).');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: { id: true, terminatedAt: true, dataPurgedAt: true },
    });
    if (!org) throw new NotFoundException('Tenant not found.');
    if (org.dataPurgedAt) throw new ConflictException('Tenant data has already been purged.');
    if (!org.terminatedAt) {
      throw new BadRequestException('Tenant is not terminated; nothing is eligible for purge.');
    }

    const purgeDueAt = new Date(org.terminatedAt.getTime() + this.graceDays() * MS_PER_DAY);
    if (Date.now() < purgeDueAt.getTime()) {
      throw new BadRequestException(
        `Tenant is still within the grace window (eligible from ${purgeDueAt.toISOString()}).`,
      );
    }

    if (confirmation !== tenantId) {
      throw new BadRequestException('Confirmation does not match the tenant id. Purge aborted.');
    }

    const scope = { tenantId };
    const counts = {
      patients: await this.prisma.patient.count({ where: scope }),
      encounters: await this.prisma.encounter.count({ where: scope }),
      chcCases: await this.prisma.chcCase.count({ where: scope }),
      virtualWardEnrolments: await this.prisma.virtualWardEnrolment.count({ where: scope }),
    };

    if (dryRun) {
      await this.audit(actorId, tenantId, 'PURGE_TENANT_DRY_RUN', reason, counts);
      this.logger.log(
        `Tenant purge DRY-RUN for ${tenantId}: would delete ${JSON.stringify(counts)}`,
      );
      return { tenantId, dryRun: true, counts, purgedAt: null };
    }

    // Delete the non-cascading patient children first, then patients (cascades
    // identifiers, contacts, events, care plans, assessments, medications,
    // processing bases, consents and search indexes).
    await this.prisma.$transaction([
      this.prisma.virtualWardEnrolment.deleteMany({ where: scope }),
      this.prisma.chcCase.deleteMany({ where: scope }),
      this.prisma.encounter.deleteMany({ where: scope }),
      this.prisma.patient.deleteMany({ where: scope }),
      this.prisma.organization.update({
        where: { id: tenantId },
        data: { dataPurgedAt: new Date() },
      }),
    ]);

    const purgedAt = new Date();
    await this.audit(actorId, tenantId, 'PURGE_TENANT', reason, counts);
    this.logger.warn(`Tenant purge EXECUTED for ${tenantId}: deleted ${JSON.stringify(counts)}`);
    return { tenantId, dryRun: false, counts, purgedAt };
  }

  private async audit(
    actorId: string,
    tenantId: string,
    action: 'PURGE_TENANT' | 'PURGE_TENANT_DRY_RUN',
    reason: string,
    counts: Record<string, number>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action,
        resource: 'Organization',
        resourceId: tenantId,
        tenantId,
        metadata: { reason, ...counts },
      },
    });
  }

  private graceDays(): number {
    const raw = this.config.get<string>('TENANT_DATA_GRACE_DAYS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_GRACE_DAYS;
  }
}
