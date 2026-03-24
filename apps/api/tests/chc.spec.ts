import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChcService } from '../src/modules/chc/chc.service';
import { ChcController } from '../src/modules/chc/chc.controller';

// ── Helpers ──────────────────────────────────────────────

const TENANT = 'tenant-1';
const USER_ID = 'user-1';
const USER = { id: USER_ID, email: 'u@e.com', globalRole: 'CLINICIAN' };

function makePrisma() {
  return {
    chcCase: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    chcDomainScore: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    chcPanelMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    chcNote: {
      create: jest.fn(),
    },
    patientEvent: {
      create: jest.fn(),
    },
  };
}

function makeEvents() {
  return {
    emitChcStatusChanged: jest.fn(),
  };
}

// ── ChcService ──────────────────────────────────────────

describe('ChcService', () => {
  let service: ChcService;
  let prisma: ReturnType<typeof makePrisma>;
  let events: ReturnType<typeof makeEvents>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = makePrisma();
    events = makeEvents();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const notifications = { notify: jest.fn().mockResolvedValue(undefined) };
    service = new ChcService(prisma as any, events as any, audit as any, notifications as any);
  });

  // ── createCase ──────────────────────────────────────

  describe('createCase', () => {
    const dto = {
      patientId: 'p1',
      referralReason: 'Complex care needs',
      isFastTrack: false,
    };

    it('creates a REFERRAL case for normal referral', async () => {
      const created = {
        id: 'chc-1',
        status: 'REFERRAL',
        patientId: 'p1',
        patient: { givenName: 'John', familyName: 'Doe' },
      };
      prisma.chcCase.create.mockResolvedValue(created);
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.createCase(dto as any, USER_ID, TENANT);

      expect(prisma.chcCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REFERRAL',
            patientId: 'p1',
            referrerId: USER_ID,
            tenantId: TENANT,
          }),
        }),
      );
      expect(result).toEqual(created);
      expect(prisma.patientEvent.create).toHaveBeenCalled();
      expect(events.emitChcStatusChanged).toHaveBeenCalledWith(TENANT, {
        caseId: 'chc-1',
        status: 'REFERRAL',
        patientName: 'John Doe',
      });
    });

    it('creates an ASSESSMENT case for fast-track referral', async () => {
      const ftDto = {
        ...dto,
        isFastTrack: true,
        fastTrackReason: 'TERMINAL_ILLNESS',
      };
      const created = {
        id: 'chc-2',
        status: 'ASSESSMENT',
        patient: { givenName: 'Jane', familyName: 'Smith' },
      };
      prisma.chcCase.create.mockResolvedValue(created);
      prisma.patientEvent.create.mockResolvedValue({});

      await service.createCase(ftDto as any, USER_ID, TENANT);

      expect(prisma.chcCase.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ASSESSMENT', isFastTrack: true }),
        }),
      );
    });
  });

  // ── searchCases ─────────────────────────────────────

  describe('searchCases', () => {
    it('returns paginated results filtered by tenant', async () => {
      const cases = [{ id: 'chc-1' }];
      prisma.chcCase.findMany.mockResolvedValue(cases);
      prisma.chcCase.count.mockResolvedValue(1);

      const result = await service.searchCases({ page: '1', limit: '10' } as any, TENANT);

      expect(result).toEqual({ data: cases, total: 1, page: 1, limit: 10 });
      expect(prisma.chcCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('filters by status when provided', async () => {
      prisma.chcCase.findMany.mockResolvedValue([]);
      prisma.chcCase.count.mockResolvedValue(0);

      await service.searchCases({ status: 'SCREENING' } as any, TENANT);

      expect(prisma.chcCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT, status: 'SCREENING' },
        }),
      );
    });
  });

  // ── getCase ─────────────────────────────────────────

  describe('getCase', () => {
    it('returns the case when found and tenant matches', async () => {
      const chcCase = { id: 'chc-1', tenantId: TENANT };
      prisma.chcCase.findUnique.mockResolvedValue(chcCase);

      const result = await service.getCase('chc-1', TENANT);
      expect(result).toEqual(chcCase);
    });

    it('throws NotFoundException when case not found', async () => {
      prisma.chcCase.findUnique.mockResolvedValue(null);

      await expect(service.getCase('nope', TENANT)).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when tenant does not match', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({ id: 'chc-1', tenantId: 'other' });

      await expect(service.getCase('chc-1', TENANT)).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateScreening ─────────────────────────────────

  describe('updateScreening', () => {
    it('transitions from REFERRAL to SCREENING', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'REFERRAL',
        patientId: 'p1',
      });
      prisma.chcCase.update.mockResolvedValue({ id: 'chc-1', status: 'SCREENING' });
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.updateScreening(
        'chc-1',
        { screeningOutcome: 'Positive' } as any,
        USER_ID,
        TENANT,
      );

      expect(result.status).toBe('SCREENING');
      expect(prisma.chcCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCREENING', screeningOutcome: 'Positive' }),
        }),
      );
    });

    it('rejects invalid transition from CLOSED', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'CLOSED',
        patientId: 'p1',
      });

      await expect(
        service.updateScreening('chc-1', { screeningOutcome: 'test' } as any, USER_ID, TENANT),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── upsertDomainScore ───────────────────────────────

  describe('upsertDomainScore', () => {
    it('upserts a domain score for the case', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({ id: 'chc-1', tenantId: TENANT });
      const score = { id: 'ds-1', domain: 'COGNITION', level: 'HIGH' };
      prisma.chcDomainScore.upsert.mockResolvedValue(score);

      const result = await service.upsertDomainScore(
        'chc-1',
        { domain: 'COGNITION', level: 'HIGH', evidence: 'test' } as any,
        USER_ID,
        TENANT,
      );

      expect(result).toEqual(score);
      expect(prisma.chcDomainScore.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { chcCaseId_domain: { chcCaseId: 'chc-1', domain: 'COGNITION' } },
        }),
      );
    });
  });

  // ── Panel members ───────────────────────────────────

  describe('addPanelMember', () => {
    it('adds a panel member', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({ id: 'chc-1', tenantId: TENANT });
      const member = { id: 'pm-1', role: 'Chair', user: { firstName: 'A', lastName: 'B' } };
      prisma.chcPanelMember.create.mockResolvedValue(member);

      const result = await service.addPanelMember(
        'chc-1',
        { userId: 'u2', role: 'Chair' } as any,
        TENANT,
      );
      expect(result).toEqual(member);
    });
  });

  describe('removePanelMember', () => {
    it('removes a panel member', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({ id: 'chc-1', tenantId: TENANT });
      prisma.chcPanelMember.findUnique.mockResolvedValue({ id: 'pm-1', chcCaseId: 'chc-1' });
      prisma.chcPanelMember.delete.mockResolvedValue({});

      const result = await service.removePanelMember('chc-1', 'pm-1', TENANT);
      expect(result).toEqual({ deleted: true });
    });

    it('throws when member not found', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({ id: 'chc-1', tenantId: TENANT });
      prisma.chcPanelMember.findUnique.mockResolvedValue(null);

      await expect(service.removePanelMember('chc-1', 'nope', TENANT)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── recordDecision ──────────────────────────────────

  describe('recordDecision', () => {
    it('approves and transitions to APPROVED', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'ASSESSMENT',
        patientId: 'p1',
      });
      prisma.chcCase.update.mockResolvedValue({ id: 'chc-1', status: 'APPROVED' });
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.recordDecision(
        'chc-1',
        { decision: 'APPROVED', fundingBand: 'STANDARD' } as any,
        USER_ID,
        TENANT,
      );

      expect(result.status).toBe('APPROVED');
      expect(prisma.chcCase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', decision: 'APPROVED' }),
        }),
      );
    });

    it('rejects and transitions to REJECTED', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'ASSESSMENT',
        patientId: 'p1',
      });
      prisma.chcCase.update.mockResolvedValue({ id: 'chc-1', status: 'REJECTED' });
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.recordDecision(
        'chc-1',
        { decision: 'REJECTED' } as any,
        USER_ID,
        TENANT,
      );
      expect(result.status).toBe('REJECTED');
    });
  });

  // ── closeCase ───────────────────────────────────────

  describe('closeCase', () => {
    it('closes a case from APPROVED status', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'APPROVED',
        patientId: 'p1',
      });
      prisma.chcCase.update.mockResolvedValue({ id: 'chc-1', status: 'CLOSED' });
      prisma.patientEvent.create.mockResolvedValue({});

      const result = await service.closeCase('chc-1', USER_ID, TENANT);
      expect(result.status).toBe('CLOSED');
    });

    it('cannot close an already closed case', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'CLOSED',
        patientId: 'p1',
      });

      await expect(service.closeCase('chc-1', USER_ID, TENANT)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── addNote ─────────────────────────────────────────

  describe('addNote', () => {
    it('creates a note with the current case phase', async () => {
      prisma.chcCase.findUnique.mockResolvedValue({
        id: 'chc-1',
        tenantId: TENANT,
        status: 'ASSESSMENT',
      });
      const note = { id: 'n1', content: 'Test', phase: 'ASSESSMENT' };
      prisma.chcNote.create.mockResolvedValue(note);

      const result = await service.addNote('chc-1', { content: 'Test' } as any, USER_ID, TENANT);

      expect(result).toEqual(note);
      expect(prisma.chcNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phase: 'ASSESSMENT', authorId: USER_ID }),
        }),
      );
    });
  });

  // ── getDueForReview ─────────────────────────────────

  describe('getDueForReview', () => {
    it('returns cases with annual review date within 30 days', async () => {
      const cases = [{ id: 'chc-1' }];
      prisma.chcCase.findMany.mockResolvedValue(cases);

      const result = await service.getDueForReview(TENANT);

      expect(result).toEqual(cases);
      expect(prisma.chcCase.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT, status: 'CARE_PACKAGE_LIVE' }),
        }),
      );
    });
  });
});

// ── ChcController ───────────────────────────────────────

describe('ChcController', () => {
  let controller: ChcController;
  let chcService: {
    createCase: jest.Mock;
    searchCases: jest.Mock;
    getDueForReview: jest.Mock;
    getCase: jest.Mock;
    updateScreening: jest.Mock;
    upsertDomainScore: jest.Mock;
    getDomainScores: jest.Mock;
    addPanelMember: jest.Mock;
    removePanelMember: jest.Mock;
    recordDecision: jest.Mock;
    setupCarePackage: jest.Mock;
    triggerAnnualReview: jest.Mock;
    closeCase: jest.Mock;
    addNote: jest.Mock;
  };

  beforeEach(() => {
    chcService = {
      createCase: jest.fn(),
      searchCases: jest.fn(),
      getDueForReview: jest.fn(),
      getCase: jest.fn(),
      updateScreening: jest.fn(),
      upsertDomainScore: jest.fn(),
      getDomainScores: jest.fn(),
      addPanelMember: jest.fn(),
      removePanelMember: jest.fn(),
      recordDecision: jest.fn(),
      setupCarePackage: jest.fn(),
      triggerAnnualReview: jest.fn(),
      closeCase: jest.fn(),
      addNote: jest.fn(),
    };

    controller = new ChcController(chcService as any);
  });

  it('create delegates to chcService.createCase', async () => {
    const dto = { patientId: 'p1', referralReason: 'test', isFastTrack: false };
    const expected = { id: 'chc-1' };
    chcService.createCase.mockResolvedValue(expected);

    const result = await controller.create(dto as any, USER, TENANT);

    expect(chcService.createCase).toHaveBeenCalledWith(dto, USER_ID, TENANT);
    expect(result).toEqual(expected);
  });

  it('search delegates to chcService.searchCases', async () => {
    const dto = { page: '1', limit: '10' };
    const expected = { data: [], total: 0, page: 1, limit: 10 };
    chcService.searchCases.mockResolvedValue(expected);

    const result = await controller.search(dto as any, TENANT);

    expect(chcService.searchCases).toHaveBeenCalledWith(dto, TENANT);
    expect(result).toEqual(expected);
  });

  it('getCase delegates with id and tenantId', async () => {
    const expected = { id: 'chc-1' };
    chcService.getCase.mockResolvedValue(expected);

    const result = await controller.getCase('chc-1', TENANT);

    expect(chcService.getCase).toHaveBeenCalledWith('chc-1', TENANT);
    expect(result).toEqual(expected);
  });

  it('updateScreening delegates with id, dto, userId, tenantId', async () => {
    const dto = { screeningOutcome: 'Positive' };
    chcService.updateScreening.mockResolvedValue({});

    await controller.updateScreening('chc-1', dto as any, USER, TENANT);

    expect(chcService.updateScreening).toHaveBeenCalledWith('chc-1', dto, USER_ID, TENANT);
  });

  it('recordDecision delegates with correct args', async () => {
    const dto = { decision: 'APPROVED', fundingBand: 'STANDARD' };
    chcService.recordDecision.mockResolvedValue({});

    await controller.recordDecision('chc-1', dto as any, USER, TENANT);

    expect(chcService.recordDecision).toHaveBeenCalledWith('chc-1', dto, USER_ID, TENANT);
  });

  it('addNote delegates with correct args', async () => {
    const dto = { content: 'A note' };
    chcService.addNote.mockResolvedValue({});

    await controller.addNote('chc-1', dto as any, USER, TENANT);

    expect(chcService.addNote).toHaveBeenCalledWith('chc-1', dto, USER_ID, TENANT);
  });

  it('removePanelMember delegates with caseId, memberId, tenantId', async () => {
    chcService.removePanelMember.mockResolvedValue({ deleted: true });

    await controller.removePanelMember('chc-1', 'pm-1', TENANT);

    expect(chcService.removePanelMember).toHaveBeenCalledWith('chc-1', 'pm-1', TENANT);
  });

  it('closeCase delegates with id, userId, tenantId', async () => {
    chcService.closeCase.mockResolvedValue({});

    await controller.closeCase('chc-1', USER, TENANT);

    expect(chcService.closeCase).toHaveBeenCalledWith('chc-1', USER_ID, TENANT);
  });

  it('triggerAnnualReview delegates with id, userId, tenantId', async () => {
    chcService.triggerAnnualReview.mockResolvedValue({});

    await controller.triggerAnnualReview('chc-1', USER, TENANT);

    expect(chcService.triggerAnnualReview).toHaveBeenCalledWith('chc-1', USER_ID, TENANT);
  });

  it('getDueForReview delegates with tenantId', async () => {
    chcService.getDueForReview.mockResolvedValue([]);

    await controller.getDueForReview(TENANT);

    expect(chcService.getDueForReview).toHaveBeenCalledWith(TENANT);
  });
});
