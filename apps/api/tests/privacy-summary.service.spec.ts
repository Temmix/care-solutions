import { PrivacySummaryService } from '../src/modules/privacy/privacy-summary.service';

const TENANT = 'tenant-1';

const buildPrisma = () => ({
  patientProcessingBasis: { groupBy: jest.fn() },
  patientConsent: { groupBy: jest.fn() },
});

describe('PrivacySummaryService.getProcessingSummary', () => {
  it('aggregates lawful bases by purpose and Art. 6, and consents by type+status', async () => {
    const prisma = buildPrisma();
    prisma.patientProcessingBasis.groupBy
      .mockResolvedValueOnce([
        { purpose: 'DIRECT_CARE', _count: 12 },
        { purpose: 'BILLING', _count: 3 },
      ])
      .mockResolvedValueOnce([{ article6Basis: 'PUBLIC_TASK', _count: 15 }]);
    prisma.patientConsent.groupBy.mockResolvedValue([
      { type: 'RESEARCH', status: 'GRANTED', _count: 4 },
      { type: 'RESEARCH', status: 'WITHDRAWN', _count: 1 },
    ]);

    const service = new PrivacySummaryService(prisma as never);
    const result = await service.getProcessingSummary(TENANT);

    expect(result.purposes).toEqual([
      { purpose: 'DIRECT_CARE', count: 12 },
      { purpose: 'BILLING', count: 3 },
    ]);
    expect(result.article6Bases).toEqual([{ basis: 'PUBLIC_TASK', count: 15 }]);
    expect(result.consents).toEqual([
      { type: 'RESEARCH', status: 'GRANTED', count: 4 },
      { type: 'RESEARCH', status: 'WITHDRAWN', count: 1 },
    ]);
  });

  it('scopes every aggregation to the tenant', async () => {
    const prisma = buildPrisma();
    prisma.patientProcessingBasis.groupBy.mockResolvedValue([]);
    prisma.patientConsent.groupBy.mockResolvedValue([]);

    const service = new PrivacySummaryService(prisma as never);
    const result = await service.getProcessingSummary(TENANT);

    expect(prisma.patientProcessingBasis.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT } }),
    );
    expect(prisma.patientConsent.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT } }),
    );
    expect(result).toEqual({ purposes: [], article6Bases: [], consents: [] });
  });
});
