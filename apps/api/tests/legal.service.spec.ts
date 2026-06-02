import { LegalService } from '../src/modules/legal/legal.service';

const TENANT = 'tenant-1';
const ACTOR = 'user-1';
const CURRENT_VERSION = '2026-04-15';

const buildPrisma = () => ({
  legalAcceptance: {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest
      .fn()
      .mockImplementation(({ create }: { create: Record<string, unknown> }) =>
        Promise.resolve({ id: 'la1', ...create }),
      ),
  },
  auditLog: { create: jest.fn().mockResolvedValue({}) },
});

describe('LegalService', () => {
  const build = (prisma: ReturnType<typeof buildPrisma>) => new LegalService(prisma as never);

  it('lists the four current legal documents with versions', () => {
    const docs = build(buildPrisma()).getCurrentDocuments();
    expect(docs.map((d) => d.type)).toEqual([
      'DPA',
      'PRIVACY_POLICY',
      'TERMS_OF_SERVICE',
      'ACCEPTABLE_USE_POLICY',
    ]);
    expect(docs.every((d) => d.version === CURRENT_VERSION)).toBe(true);
  });

  it('reports all documents outstanding when nothing is accepted', async () => {
    const prisma = buildPrisma();
    const status = await build(prisma).getAcceptanceStatus(TENANT);

    expect(status.allAccepted).toBe(false);
    expect(status.outstanding).toEqual([
      'DPA',
      'PRIVACY_POLICY',
      'TERMS_OF_SERVICE',
      'ACCEPTABLE_USE_POLICY',
    ]);
    expect(status.documents.every((d) => !d.accepted)).toBe(true);
  });

  it('marks a document accepted only for the matching current version', async () => {
    const prisma = buildPrisma();
    prisma.legalAcceptance.findMany.mockResolvedValue([
      {
        documentType: 'DPA',
        version: CURRENT_VERSION,
        acceptedAt: new Date('2026-05-01'),
        acceptedById: ACTOR,
      },
      // An old version of the Privacy Policy should NOT count as accepted.
      {
        documentType: 'PRIVACY_POLICY',
        version: '2025-01-01',
        acceptedAt: new Date(),
        acceptedById: ACTOR,
      },
    ]);

    const status = await build(prisma).getAcceptanceStatus(TENANT);
    const dpa = status.documents.find((d) => d.type === 'DPA');
    const privacy = status.documents.find((d) => d.type === 'PRIVACY_POLICY');

    expect(dpa?.accepted).toBe(true);
    expect(dpa?.acceptedById).toBe(ACTOR);
    expect(privacy?.accepted).toBe(false);
    expect(status.outstanding).toContain('PRIVACY_POLICY');
    expect(status.outstanding).not.toContain('DPA');
  });

  it('records acceptance at the server-resolved current version with IP and actor, and audits it', async () => {
    const prisma = buildPrisma();
    await build(prisma).recordAcceptance('DPA', ACTOR, TENANT, '203.0.113.5', 'Mozilla/5.0');

    expect(prisma.legalAcceptance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_documentType_version: {
            tenantId: TENANT,
            documentType: 'DPA',
            version: CURRENT_VERSION,
          },
        },
        create: expect.objectContaining({
          tenantId: TENANT,
          documentType: 'DPA',
          version: CURRENT_VERSION,
          acceptedById: ACTOR,
          ipAddress: '203.0.113.5',
          userAgent: 'Mozilla/5.0',
        }),
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'ACCEPT_LEGAL_DOCUMENT',
        resource: 'LegalAcceptance',
        tenantId: TENANT,
        metadata: { documentType: 'DPA', version: CURRENT_VERSION },
      }),
    });
  });

  it('lists acceptance history scoped to the tenant', async () => {
    const prisma = buildPrisma();
    await build(prisma).listAcceptances(TENANT);
    expect(prisma.legalAcceptance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT } }),
    );
  });
});
