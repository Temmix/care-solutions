import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateTenantIdentityDto } from './dto';

@Injectable()
export class TenantVerificationService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  /** Returns orgs awaiting review (UNVERIFIED or PENDING_REVIEW) plus a snapshot of their state. */
  async listPendingVerification() {
    const orgs = await this.prisma.organization.findMany({
      where: { verificationStatus: { in: ['UNVERIFIED', 'PENDING_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        subscription: {
          select: { tier: true, status: true, trialEndsAt: true },
        },
      },
    });

    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.type,
      email: o.email,
      odsCode: o.odsCode,
      companiesHouseNumber: o.companiesHouseNumber,
      cqcProviderId: o.cqcProviderId,
      verificationStatus: o.verificationStatus,
      verificationNotes: o.verificationNotes,
      createdAt: o.createdAt,
      subscription: o.subscription,
    }));
  }

  async getTenantDetail(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: true,
        verifiedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!org) throw new NotFoundException('Organisation not found.');

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { tenantId: organizationId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });

    return { ...org, auditLogs };
  }

  async updateIdentity(organizationId: string, dto: UpdateTenantIdentityDto, adminUserId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organisation not found.');

    const before = {
      companiesHouseNumber: org.companiesHouseNumber,
      cqcProviderId: org.cqcProviderId,
      odsCode: org.odsCode,
      verificationNotes: org.verificationNotes,
    };

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        companiesHouseNumber: dto.companiesHouseNumber ?? org.companiesHouseNumber,
        cqcProviderId: dto.cqcProviderId ?? org.cqcProviderId,
        odsCode: dto.odsCode ?? org.odsCode,
        verificationNotes: dto.verificationNotes ?? org.verificationNotes,
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'TENANT_IDENTITY_UPDATED',
      resource: 'Organization',
      resourceId: organizationId,
      tenantId: organizationId,
      metadata: {
        before,
        after: {
          companiesHouseNumber: updated.companiesHouseNumber,
          cqcProviderId: updated.cqcProviderId,
          odsCode: updated.odsCode,
          verificationNotes: updated.verificationNotes,
        },
      },
    });

    return updated;
  }

  async verify(organizationId: string, adminUserId: string, notes?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organisation not found.');
    if (org.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Organisation is already verified.');
    }

    const before = { status: org.verificationStatus };
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: adminUserId,
        verificationNotes: notes ?? org.verificationNotes,
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'TENANT_VERIFIED',
      resource: 'Organization',
      resourceId: organizationId,
      tenantId: organizationId,
      metadata: {
        notes,
        before,
        after: {
          status: updated.verificationStatus,
          verifiedAt: updated.verifiedAt,
          verifiedById: updated.verifiedById,
        },
      },
    });

    return updated;
  }

  async resetVerification(organizationId: string, adminUserId: string, reason?: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organisation not found.');
    if (org.verificationStatus === 'UNVERIFIED') {
      throw new BadRequestException('Organisation is already unverified.');
    }

    const before = {
      status: org.verificationStatus,
      verifiedAt: org.verifiedAt,
      verifiedById: org.verifiedById,
    };
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        verificationStatus: 'UNVERIFIED',
        verifiedAt: null,
        verifiedById: null,
        // verificationNotes preserved — useful audit trail of why this was reset
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'TENANT_VERIFICATION_RESET',
      resource: 'Organization',
      resourceId: organizationId,
      tenantId: organizationId,
      metadata: {
        reason,
        before,
        after: { status: updated.verificationStatus },
      },
    });

    return updated;
  }

  async reject(organizationId: string, adminUserId: string, reason: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) throw new NotFoundException('Organisation not found.');

    const before = { status: org.verificationStatus };
    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        verificationStatus: 'REJECTED',
        verificationNotes: reason,
        verifiedAt: null,
        verifiedById: null,
      },
    });

    await this.audit.log({
      userId: adminUserId,
      action: 'TENANT_REJECTED',
      resource: 'Organization',
      resourceId: organizationId,
      tenantId: organizationId,
      metadata: {
        reason,
        before,
        after: { status: updated.verificationStatus },
      },
    });

    return updated;
  }
}
