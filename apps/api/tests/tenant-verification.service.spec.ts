import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantVerificationService } from '../src/modules/billing/tenant-verification.service';

describe('TenantVerificationService', () => {
  let service: TenantVerificationService;
  let prisma: {
    organization: { findUnique: jest.Mock; findMany: jest.Mock; update: jest.Mock };
    auditLog: { findMany: jest.Mock };
  };
  let audit: { log: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      organization: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    service = new TenantVerificationService(prisma as any, audit as any);
  });

  describe('listPendingVerification', () => {
    it('queries UNVERIFIED + PENDING_REVIEW orgs and shapes the response', async () => {
      prisma.organization.findMany.mockResolvedValue([
        {
          id: 'org-1',
          name: 'Test Org',
          type: 'CARE_HOME',
          email: 'a@b.com',
          odsCode: null,
          companiesHouseNumber: '12345678',
          cqcProviderId: null,
          verificationStatus: 'UNVERIFIED',
          verificationNotes: null,
          createdAt: new Date(),
          subscription: { tier: 'PROFESSIONAL', status: 'TRIALING', trialEndsAt: new Date() },
        },
      ]);

      const result = await service.listPendingVerification();
      expect(prisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { verificationStatus: { in: ['UNVERIFIED', 'PENDING_REVIEW'] } },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-1');
    });
  });

  describe('verify', () => {
    it('marks tenant as VERIFIED, sets verifiedAt + verifiedById, and audits', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'UNVERIFIED',
        verificationNotes: null,
      });
      prisma.organization.update.mockResolvedValue({
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: 'admin-1',
      });

      await service.verify('org-1', 'admin-1', 'CHN matches');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: expect.objectContaining({
          verificationStatus: 'VERIFIED',
          verifiedById: 'admin-1',
          verificationNotes: 'CHN matches',
        }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'TENANT_VERIFIED',
          resource: 'Organization',
          resourceId: 'org-1',
        }),
      );
    });

    it('rejects re-verifying an already-VERIFIED tenant', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'VERIFIED',
      });
      await expect(service.verify('org-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for unknown organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.verify('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reject', () => {
    it('marks tenant as REJECTED with reason and audits', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'PENDING_REVIEW',
      });
      prisma.organization.update.mockResolvedValue({ verificationStatus: 'REJECTED' });

      await service.reject('org-1', 'admin-1', 'CHN does not exist');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: expect.objectContaining({
          verificationStatus: 'REJECTED',
          verificationNotes: 'CHN does not exist',
          verifiedAt: null,
          verifiedById: null,
        }),
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_REJECTED',
          metadata: expect.objectContaining({ reason: 'CHN does not exist' }),
        }),
      );
    });
  });

  describe('resetVerification', () => {
    it('flips VERIFIED tenant back to UNVERIFIED, clears verifiedAt + verifiedById, audits', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date('2026-05-01'),
        verifiedById: 'admin-old',
      });
      prisma.organization.update.mockResolvedValue({ verificationStatus: 'UNVERIFIED' });

      await service.resetVerification('org-1', 'admin-1', 'mis-clicked verify');

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: {
          verificationStatus: 'UNVERIFIED',
          verifiedAt: null,
          verifiedById: null,
        },
      });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          action: 'TENANT_VERIFICATION_RESET',
          resource: 'Organization',
          resourceId: 'org-1',
          metadata: expect.objectContaining({ reason: 'mis-clicked verify' }),
        }),
      );
    });

    it('also resets a REJECTED tenant', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'REJECTED',
        verifiedAt: null,
        verifiedById: null,
      });
      prisma.organization.update.mockResolvedValue({ verificationStatus: 'UNVERIFIED' });

      await service.resetVerification('org-1', 'admin-1');

      expect(prisma.organization.update).toHaveBeenCalled();
    });

    it('rejects when already UNVERIFIED (no-op guard)', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        verificationStatus: 'UNVERIFIED',
      });
      await expect(service.resetVerification('org-1', 'admin-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException for unknown organization', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);
      await expect(service.resetVerification('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateIdentity', () => {
    it('only updates fields provided in DTO; preserves others', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        companiesHouseNumber: '11111111',
        cqcProviderId: '1-12345',
        odsCode: 'A99',
        verificationNotes: 'old',
      });
      prisma.organization.update.mockResolvedValue({});

      await service.updateIdentity('org-1', { companiesHouseNumber: '22222222' }, 'admin-1');

      const updateData = (prisma.organization.update.mock.calls[0][0] as any).data;
      expect(updateData.companiesHouseNumber).toBe('22222222');
      // unchanged fields preserved
      expect(updateData.cqcProviderId).toBe('1-12345');
      expect(updateData.odsCode).toBe('A99');
      expect(updateData.verificationNotes).toBe('old');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TENANT_IDENTITY_UPDATED' }),
      );
    });
  });
});
