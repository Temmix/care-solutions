import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';

const DEFAULT_AUDIT_LOG_RETENTION_DAYS = 1095; // 3 years
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AuditPurgeResult {
  enabled: boolean;
  deleted: number;
  cutoff: Date | null;
}

/**
 * Enforces documented data-retention periods on a schedule.
 *
 * Destructive, so it is OPT-IN: nothing is deleted unless RETENTION_ENABLED is
 * "true" (default off, keeping every environment safe until explicitly turned
 * on). Currently covers audit-log retention (Privacy Policy / DPA: audit logs
 * kept >= 3 years). Periods are env-configurable.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  // Daily at 03:00 Europe/London (off-peak).
  @Cron('0 3 * * *', { name: 'audit-log-retention', timeZone: 'Europe/London' })
  async runDaily(): Promise<void> {
    await this.purgeExpiredAuditLogs();
  }

  /**
   * Delete audit logs older than the configured retention period. No-op (and
   * deletes nothing) unless RETENTION_ENABLED === "true".
   */
  async purgeExpiredAuditLogs(): Promise<AuditPurgeResult> {
    if (this.config.get<string>('RETENTION_ENABLED') !== 'true') {
      this.logger.log('Retention disabled (RETENTION_ENABLED != "true"); skipping audit-log purge');
      return { enabled: false, deleted: 0, cutoff: null };
    }

    const days = this.retentionDays();
    const cutoff = new Date(Date.now() - days * MS_PER_DAY);

    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(
      `Audit-log retention: purged ${count} entries older than ${days} days (before ${cutoff.toISOString()})`,
    );
    return { enabled: true, deleted: count, cutoff };
  }

  private retentionDays(): number {
    const raw = this.config.get<string>('AUDIT_LOG_RETENTION_DAYS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUDIT_LOG_RETENTION_DAYS;
  }
}
