import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { ChcStatus, ChcDecision } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateChcCaseDto,
  UpdateChcScreeningDto,
  UpdateChcDomainScoreDto,
  AddPanelMemberDto,
  RecordChcDecisionDto,
  SetupCarePackageDto,
  AddChcNoteDto,
  SearchChcCasesDto,
} from './dto';

// Valid status transitions
const STATUS_TRANSITIONS: Record<ChcStatus, ChcStatus[]> = {
  REFERRAL: ['SCREENING', 'ASSESSMENT'], // ASSESSMENT allowed for fast-track
  SCREENING: ['ASSESSMENT', 'CLOSED'],
  ASSESSMENT: ['DECISION'],
  DECISION: ['APPROVED', 'REJECTED'],
  APPROVED: ['CARE_PACKAGE_LIVE', 'CLOSED'],
  REJECTED: ['CLOSED', 'REFERRAL'], // allow re-referral
  CARE_PACKAGE_LIVE: ['ANNUAL_REVIEW', 'CLOSED'],
  ANNUAL_REVIEW: ['CARE_PACKAGE_LIVE', 'CLOSED'],
  CLOSED: [],
};

@Injectable()
export class ChcService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(EventsService) private events: EventsService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(NotificationsService) private notifications: NotificationsService,
  ) {}

  // ── Create referral ──────────────────────────────────────

  async createCase(dto: CreateChcCaseDto, userId: string, tenantId: string) {
    const chcCase = await this.prisma.chcCase.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        referralReason: dto.referralReason,
        isFastTrack: dto.isFastTrack,
        fastTrackReason: dto.fastTrackReason,
        referrerId: userId,
        tenantId,
        status: dto.isFastTrack ? 'ASSESSMENT' : 'REFERRAL',
      },
      include: {
        patient: { select: { givenName: true, familyName: true } },
      },
    });

    // Patient timeline event
    await this.prisma.patientEvent.create({
      data: {
        patientId: dto.patientId,
        eventType: 'CHC_REFERRAL',
        summary: `CHC ${dto.isFastTrack ? 'fast-track ' : ''}referral created`,
        detail: { caseId: chcCase.id, reason: dto.referralReason },
        recordedById: userId,
        tenantId,
      },
    });

    this.events.emitChcStatusChanged(tenantId, {
      caseId: chcCase.id,
      status: chcCase.status,
      patientName: `${chcCase.patient.givenName} ${chcCase.patient.familyName}`,
    });

    this.audit
      .log({
        userId,
        action: 'CREATE',
        resource: 'ChcCase',
        resourceId: chcCase.id,
        tenantId,
        metadata: { patientId: dto.patientId },
      })
      .catch(() => {});

    return chcCase;
  }

  // ── List cases ───────────────────────────────────────────

  async searchCases(dto: SearchChcCasesDto, tenantId: string) {
    const page = parseInt(dto.page ?? '1', 10);
    const limit = parseInt(dto.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (dto.status) where.status = dto.status;
    if (dto.patientId) where.patientId = dto.patientId;

    const [data, total] = await Promise.all([
      this.prisma.chcCase.findMany({
        where,
        include: {
          patient: { select: { givenName: true, familyName: true, birthDate: true } },
          referrer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.chcCase.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // ── Cases due for annual review ──────────────────────────

  async getDueForReview(tenantId: string) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return this.prisma.chcCase.findMany({
      where: {
        tenantId,
        status: 'CARE_PACKAGE_LIVE',
        annualReviewDate: { lte: thirtyDaysFromNow },
      },
      include: {
        patient: { select: { givenName: true, familyName: true } },
      },
      orderBy: { annualReviewDate: 'asc' },
    });
  }

  // ── Get single case ──────────────────────────────────────

  async getCase(id: string, tenantId: string) {
    const chcCase = await this.prisma.chcCase.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, givenName: true, familyName: true, birthDate: true } },
        encounter: { select: { id: true, status: true, class: true } },
        carePlan: { select: { id: true, title: true, status: true } },
        referrer: { select: { firstName: true, lastName: true } },
        screener: { select: { firstName: true, lastName: true } },
        domainScores: {
          include: { assessor: { select: { firstName: true, lastName: true } } },
          orderBy: { domain: 'asc' },
        },
        panelMembers: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
        notes: {
          include: { author: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!chcCase || chcCase.tenantId !== tenantId) {
      throw new NotFoundException('CHC case not found');
    }

    return chcCase;
  }

  // ── Screening ────────────────────────────────────────────

  async updateScreening(id: string, dto: UpdateChcScreeningDto, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(id, tenantId);
    this.assertTransition(chcCase.status, 'SCREENING');

    const updated = await this.prisma.chcCase.update({
      where: { id },
      data: {
        status: 'SCREENING',
        screeningDate: new Date(),
        screeningOutcome: dto.screeningOutcome,
        screeningNotes: dto.screeningNotes,
        screenerId: userId,
      },
    });

    await this.recordStatusChange(id, chcCase.patientId, 'SCREENING', userId, tenantId);

    this.audit
      .log({
        userId,
        action: 'UPDATE_SCREENING',
        resource: 'ChcCase',
        resourceId: id,
        tenantId,
        metadata: { status: 'SCREENING' },
      })
      .catch(() => {});

    return updated;
  }

  // ── Domain scores ────────────────────────────────────────

  async upsertDomainScore(
    caseId: string,
    dto: UpdateChcDomainScoreDto,
    userId: string,
    tenantId: string,
  ) {
    await this.requireCase(caseId, tenantId);

    return this.prisma.chcDomainScore.upsert({
      where: { chcCaseId_domain: { chcCaseId: caseId, domain: dto.domain } },
      create: {
        chcCaseId: caseId,
        domain: dto.domain,
        level: dto.level,
        evidence: dto.evidence,
        notes: dto.notes,
        assessorId: userId,
      },
      update: {
        level: dto.level,
        evidence: dto.evidence,
        notes: dto.notes,
        assessorId: userId,
      },
    });
  }

  async getDomainScores(caseId: string, tenantId: string) {
    await this.requireCase(caseId, tenantId);

    return this.prisma.chcDomainScore.findMany({
      where: { chcCaseId: caseId },
      include: { assessor: { select: { firstName: true, lastName: true } } },
      orderBy: { domain: 'asc' },
    });
  }

  // ── Panel members ────────────────────────────────────────

  async addPanelMember(caseId: string, dto: AddPanelMemberDto, tenantId: string) {
    await this.requireCase(caseId, tenantId);

    return this.prisma.chcPanelMember.create({
      data: {
        chcCaseId: caseId,
        userId: dto.userId,
        role: dto.role,
      },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });
  }

  async removePanelMember(caseId: string, memberId: string, tenantId: string) {
    await this.requireCase(caseId, tenantId);

    const member = await this.prisma.chcPanelMember.findUnique({ where: { id: memberId } });
    if (!member || member.chcCaseId !== caseId) {
      throw new NotFoundException('Panel member not found');
    }

    await this.prisma.chcPanelMember.delete({ where: { id: memberId } });
    return { deleted: true };
  }

  // ── Decision ─────────────────────────────────────────────

  async recordDecision(id: string, dto: RecordChcDecisionDto, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(id, tenantId);
    this.assertTransition(chcCase.status, 'DECISION');

    const newStatus = dto.decision === ChcDecision.APPROVED ? 'APPROVED' : 'REJECTED';

    const updated = await this.prisma.chcCase.update({
      where: { id },
      data: {
        status: newStatus,
        decisionDate: new Date(),
        decision: dto.decision,
        decisionNotes: dto.decisionNotes,
        fundingBand: dto.fundingBand,
      },
    });

    await this.recordStatusChange(id, chcCase.patientId, newStatus, userId, tenantId);

    this.audit
      .log({
        userId,
        action: 'RECORD_DECISION',
        resource: 'ChcCase',
        resourceId: id,
        tenantId,
        metadata: { decision: dto.decision },
      })
      .catch(() => {});

    this.notifications
      .notify({
        userId: chcCase.referrerId,
        tenantId,
        type: 'CHC_STATUS_CHANGE' as any,
        title: 'CHC Decision Recorded',
        message: `Decision "${dto.decision}" has been recorded for CHC case`,
        link: `/app/chc/${id}`,
      })
      .catch(() => {});

    return updated;
  }

  // ── Care package ─────────────────────────────────────────

  async setupCarePackage(id: string, dto: SetupCarePackageDto, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(id, tenantId);
    this.assertTransition(chcCase.status, 'CARE_PACKAGE_LIVE');

    const updated = await this.prisma.chcCase.update({
      where: { id },
      data: {
        status: 'CARE_PACKAGE_LIVE',
        carePlanId: dto.carePlanId,
        carePackageStartDate: new Date(dto.carePackageStartDate),
        annualReviewDate: dto.annualReviewDate ? new Date(dto.annualReviewDate) : null,
      },
    });

    await this.recordStatusChange(id, chcCase.patientId, 'CARE_PACKAGE_LIVE', userId, tenantId);

    this.audit
      .log({ userId, action: 'SETUP_CARE_PACKAGE', resource: 'ChcCase', resourceId: id, tenantId })
      .catch(() => {});

    return updated;
  }

  // ── Annual review ────────────────────────────────────────

  async triggerAnnualReview(id: string, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(id, tenantId);
    this.assertTransition(chcCase.status, 'ANNUAL_REVIEW');

    const updated = await this.prisma.chcCase.update({
      where: { id },
      data: {
        status: 'ANNUAL_REVIEW',
      },
    });

    await this.recordStatusChange(id, chcCase.patientId, 'ANNUAL_REVIEW', userId, tenantId);
    return updated;
  }

  // ── Close case ───────────────────────────────────────────

  async closeCase(id: string, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(id, tenantId);
    this.assertTransition(chcCase.status, 'CLOSED');

    const updated = await this.prisma.chcCase.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    await this.recordStatusChange(id, chcCase.patientId, 'CLOSED', userId, tenantId);

    this.audit
      .log({ userId, action: 'CLOSE', resource: 'ChcCase', resourceId: id, tenantId })
      .catch(() => {});

    return updated;
  }

  // ── Notes ────────────────────────────────────────────────

  async addNote(caseId: string, dto: AddChcNoteDto, userId: string, tenantId: string) {
    const chcCase = await this.requireCase(caseId, tenantId);

    const note = await this.prisma.chcNote.create({
      data: {
        chcCaseId: caseId,
        content: dto.content,
        phase: chcCase.status,
        authorId: userId,
      },
      include: { author: { select: { firstName: true, lastName: true } } },
    });

    this.audit
      .log({
        userId,
        action: 'ADD_NOTE',
        resource: 'ChcCase',
        resourceId: caseId,
        tenantId,
        metadata: { caseId },
      })
      .catch(() => {});

    return note;
  }

  // ── Helpers ──────────────────────────────────────────────

  private async requireCase(id: string, tenantId: string) {
    const chcCase = await this.prisma.chcCase.findUnique({ where: { id } });
    if (!chcCase || chcCase.tenantId !== tenantId) {
      throw new NotFoundException('CHC case not found');
    }
    return chcCase;
  }

  private assertTransition(current: ChcStatus, target: ChcStatus): void {
    const allowed = STATUS_TRANSITIONS[current];
    if (!allowed?.includes(target)) {
      throw new BadRequestException(`Cannot transition from ${current} to ${target}`);
    }
  }

  private async recordStatusChange(
    caseId: string,
    patientId: string,
    status: string,
    userId: string,
    tenantId: string,
  ): Promise<void> {
    await this.prisma.patientEvent.create({
      data: {
        patientId,
        eventType: 'CHC_STATUS_CHANGE',
        summary: `CHC case status changed to ${status}`,
        detail: { caseId, status },
        recordedById: userId,
        tenantId,
      },
    });

    this.events.emitChcStatusChanged(tenantId, {
      caseId,
      status,
      patientName: '',
    });
  }
}
