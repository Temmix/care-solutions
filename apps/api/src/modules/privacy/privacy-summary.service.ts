import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProcessingActivitiesSummary {
  /** Lawful-basis records grouped by processing purpose. */
  purposes: Array<{ purpose: string; count: number }>;
  /** Lawful-basis records grouped by UK GDPR Art. 6 basis actually in use. */
  article6Bases: Array<{ basis: string; count: number }>;
  /** Consent records grouped by type and status. */
  consents: Array<{ type: string; status: string; count: number }>;
}

/**
 * Tenant-level, read-only summary of the lawful bases and consents in use —
 * an accountability / Records-of-Processing-Activities (Art. 30) overview
 * built from the data captured per patient.
 */
@Injectable()
export class PrivacySummaryService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getProcessingSummary(tenantId: string): Promise<ProcessingActivitiesSummary> {
    const [byPurpose, byArticle6, byConsent] = await Promise.all([
      this.prisma.patientProcessingBasis.groupBy({
        by: ['purpose'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.patientProcessingBasis.groupBy({
        by: ['article6Basis'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.patientConsent.groupBy({
        by: ['type', 'status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return {
      purposes: byPurpose.map((p) => ({ purpose: p.purpose, count: p._count })),
      article6Bases: byArticle6.map((a) => ({ basis: a.article6Basis, count: a._count })),
      consents: byConsent.map((c) => ({ type: c.type, status: c.status, count: c._count })),
    };
  }
}
