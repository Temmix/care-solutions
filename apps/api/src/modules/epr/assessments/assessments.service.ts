import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AssessmentTypesService } from '../assessment-types/assessment-types.service';
import type { CreateAssessmentDto } from './dto/create-assessment.dto';
import type { UpdateAssessmentDto } from './dto/update-assessment.dto';
import type { SearchAssessmentsDto } from './dto/search-assessments.dto';
import {
  toFhirAssessment,
  toFhirAssessmentBundle,
  type AssessmentWithRelations,
} from './mappers/assessment-fhir.mapper';

const ASSESSMENT_INCLUDES = {
  patient: { select: { id: true, givenName: true, familyName: true } },
  performedBy: { select: { id: true, firstName: true, lastName: true } },
  reviewedBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AssessmentTypesService) private assessmentTypes: AssessmentTypesService,
  ) {}

  // ── Create ──────────────────────────────────────────────

  async create(dto: CreateAssessmentDto, userId: string, tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');

    const validType = await this.assessmentTypes.validateCode(dto.assessmentType, tenantId);
    if (!validType) throw new BadRequestException(`Invalid assessment type: ${dto.assessmentType}`);

    const { patientId, performedAt, ...rest } = dto;

    const assessment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          ...rest,
          performedAt: performedAt ? new Date(performedAt) : new Date(),
          patientId,
          performedById: userId,
          tenantId,
          recommendedActions: rest.recommendedActions ?? undefined,
          responses: rest.responses as Prisma.InputJsonValue | undefined,
        },
        include: ASSESSMENT_INCLUDES,
      });

      await tx.patientEvent.create({
        data: {
          patientId,
          eventType: 'ASSESSMENT',
          summary: `Assessment performed: ${rest.title}`,
          detail: {
            assessmentId: created.id,
            assessmentType: rest.assessmentType,
          } as unknown as Prisma.InputJsonValue,
          recordedById: userId,
          tenantId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          resource: 'Assessment',
          resourceId: created.id,
          tenantId,
        },
      });

      return created;
    });

    return toFhirAssessment(assessment as AssessmentWithRelations);
  }

  // ── Search ──────────────────────────────────────────────

  async findAll(dto: SearchAssessmentsDto, tenantId: string) {
    if (!tenantId) throw new BadRequestException('Tenant context is required');
    const page = Number(dto.page) || 1;
    const limit = Number(dto.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AssessmentWhereInput = { tenantId };
    if (dto.patientId) where.patientId = dto.patientId;
    if (dto.assessmentType) where.assessmentType = dto.assessmentType;
    if (dto.status) where.status = dto.status;
    if (dto.riskLevel) where.riskLevel = dto.riskLevel;

    const [assessments, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        include: ASSESSMENT_INCLUDES,
        skip,
        take: limit,
        orderBy: { performedAt: 'desc' },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    const codes = [...new Set(assessments.map((a) => a.assessmentType))];
    const displayNames = await this.assessmentTypes.getDisplayNames(codes, tenantId);

    return toFhirAssessmentBundle(assessments as AssessmentWithRelations[], total, displayNames);
  }

  // ── Find One ────────────────────────────────────────────

  async findOne(id: string, tenantId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id, tenantId },
      include: ASSESSMENT_INCLUDES,
    });

    if (!assessment) throw new NotFoundException('Assessment not found');

    const displayNames = await this.assessmentTypes.getDisplayNames(
      [assessment.assessmentType],
      tenantId,
    );

    return toFhirAssessment(
      assessment as AssessmentWithRelations,
      displayNames.get(assessment.assessmentType),
    );
  }

  // ── Update ──────────────────────────────────────────────

  async update(id: string, dto: UpdateAssessmentDto, userId: string, tenantId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Assessment not found');

    const assessment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id },
        data: {
          ...dto,
          responses: dto.responses as Prisma.InputJsonValue | undefined,
        },
        include: ASSESSMENT_INCLUDES,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'UPDATE',
          resource: 'Assessment',
          resourceId: id,
          tenantId,
        },
      });

      return updated;
    });

    return toFhirAssessment(assessment as AssessmentWithRelations);
  }

  // ── Delete (soft — set CANCELLED) ───────────────────────

  async remove(id: string, userId: string, tenantId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Assessment not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.assessment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          resource: 'Assessment',
          resourceId: id,
          tenantId,
        },
      });
    });
  }

  // ── Review ──────────────────────────────────────────────

  async review(id: string, userId: string, tenantId: string) {
    const existing = await this.prisma.assessment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Assessment not found');

    const assessment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({
        where: { id },
        data: {
          status: 'REVIEWED',
          reviewedById: userId,
          reviewedAt: new Date(),
        },
        include: ASSESSMENT_INCLUDES,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'REVIEW',
          resource: 'Assessment',
          resourceId: id,
          tenantId,
        },
      });

      return updated;
    });

    return toFhirAssessment(assessment as AssessmentWithRelations);
  }
}
