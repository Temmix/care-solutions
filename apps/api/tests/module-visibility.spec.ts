import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from '../src/modules/epr/organizations/organizations.service';

describe('OrganizationsService – getEnabledModules', () => {
  let service: OrganizationsService;
  let prisma: {
    organization: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
  };

  const tenantId = 'tenant-1';

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      organization: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new OrganizationsService(prisma as any);
  });

  it('returns default modules for CARE_HOME when enabledModules is empty', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'CARE_HOME',
      enabledModules: [],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toContain('PATIENTS');
    expect(result).toContain('CARE_PLANS');
    expect(result).toContain('CHC');
    expect(result).toContain('IOT');
    expect(result).not.toContain('PATIENT_FLOW');
    expect(result).not.toContain('VIRTUAL_WARDS');
  });

  it('returns default modules for GP_PRACTICE when enabledModules is empty', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'GP_PRACTICE',
      enabledModules: [],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toContain('PATIENTS');
    expect(result).toContain('ASSESSMENTS');
    expect(result).toContain('TRAINING');
    expect(result).not.toContain('CHC');
    expect(result).not.toContain('IOT');
    expect(result).not.toContain('PATIENT_FLOW');
    expect(result).not.toContain('VIRTUAL_WARDS');
  });

  it('returns default modules for HOSPITAL when enabledModules is empty', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'HOSPITAL',
      enabledModules: [],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toContain('PATIENTS');
    expect(result).toContain('PATIENT_FLOW');
    expect(result).toContain('VIRTUAL_WARDS');
    expect(result).toContain('IOT');
    expect(result).not.toContain('CHC');
  });

  it('returns custom modules when enabledModules is set', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'CARE_HOME',
      enabledModules: ['PATIENTS', 'TRAINING', 'ROSTER'],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toEqual(['PATIENTS', 'TRAINING', 'ROSTER']);
  });

  it('filters out invalid module codes from custom list', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'CARE_HOME',
      enabledModules: ['PATIENTS', 'INVALID_CODE', 'ROSTER'],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toEqual(['PATIENTS', 'ROSTER']);
    expect(result).not.toContain('INVALID_CODE');
  });

  it('throws NotFoundException when org does not exist', async () => {
    prisma.organization.findUnique.mockResolvedValue(null);

    await expect(service.getEnabledModules(tenantId, tenantId)).rejects.toThrow(NotFoundException);
  });

  it('throws NotFoundException when tenant tries to access another org', async () => {
    await expect(service.getEnabledModules('other-org', tenantId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('allows SUPER_ADMIN (null tenantId) to access any org', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'HOSPITAL',
      enabledModules: [],
    });

    const result = await service.getEnabledModules('any-org-id', null);

    expect(result).toContain('PATIENTS');
    expect(prisma.organization.findUnique).toHaveBeenCalledWith({
      where: { id: 'any-org-id' },
      select: { type: true, enabledModules: true },
    });
  });

  it('returns all default modules for COMMUNITY_SERVICE', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      type: 'COMMUNITY_SERVICE',
      enabledModules: [],
    });

    const result = await service.getEnabledModules(tenantId, tenantId);

    expect(result).toContain('CHC');
    expect(result).toContain('VIRTUAL_WARDS');
    expect(result).not.toContain('PATIENT_FLOW');
    expect(result).not.toContain('IOT');
  });
});
