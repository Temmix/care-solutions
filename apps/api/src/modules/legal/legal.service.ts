import { Injectable, Inject } from '@nestjs/common';
import { LegalDocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CURRENT_LEGAL_DOCUMENTS, currentVersionFor } from './legal.constants';

export interface AcceptanceStatusItem {
  type: LegalDocumentType;
  title: string;
  version: string;
  accepted: boolean;
  acceptedAt: Date | null;
  acceptedById: string | null;
}

export interface AcceptanceStatus {
  documents: AcceptanceStatusItem[];
  outstanding: LegalDocumentType[];
  allAccepted: boolean;
}

/**
 * Tracks a tenant's acceptance of the current versions of the legal documents
 * (DPA, Privacy Policy, Terms, AUP). Acceptance is org-level: an admin accepts
 * on the organisation's behalf, recorded with their user id, IP and timestamp.
 */
@Injectable()
export class LegalService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getCurrentDocuments(): readonly { type: LegalDocumentType; title: string; version: string }[] {
    return CURRENT_LEGAL_DOCUMENTS;
  }

  async getAcceptanceStatus(tenantId: string): Promise<AcceptanceStatus> {
    const accepted = await this.prisma.legalAcceptance.findMany({ where: { tenantId } });
    const byKey = new Map(accepted.map((a) => [`${a.documentType}:${a.version}`, a]));

    const documents: AcceptanceStatusItem[] = CURRENT_LEGAL_DOCUMENTS.map((doc) => {
      const record = byKey.get(`${doc.type}:${doc.version}`);
      return {
        type: doc.type,
        title: doc.title,
        version: doc.version,
        accepted: Boolean(record),
        acceptedAt: record?.acceptedAt ?? null,
        acceptedById: record?.acceptedById ?? null,
      };
    });

    const outstanding = documents.filter((d) => !d.accepted).map((d) => d.type);
    return { documents, outstanding, allAccepted: outstanding.length === 0 };
  }

  listAcceptances(tenantId: string) {
    return this.prisma.legalAcceptance.findMany({
      where: { tenantId },
      orderBy: { acceptedAt: 'desc' },
    });
  }

  async recordAcceptance(
    documentType: LegalDocumentType,
    actorId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Version is resolved server-side — the client accepts the current version.
    const version = currentVersionFor(documentType);

    const acceptance = await this.prisma.legalAcceptance.upsert({
      where: { tenantId_documentType_version: { tenantId, documentType, version } },
      create: {
        tenantId,
        documentType,
        version,
        acceptedById: actorId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
      update: {
        acceptedById: actorId,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        acceptedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: actorId,
        action: 'ACCEPT_LEGAL_DOCUMENT',
        resource: 'LegalAcceptance',
        resourceId: acceptance.id,
        tenantId,
        metadata: { documentType, version },
      },
    });

    return acceptance;
  }
}
