import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, TrainingStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTrainingRecordDto } from './dto/create-training-record.dto';
import { UpdateTrainingRecordDto } from './dto/update-training-record.dto';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { SearchTrainingDto } from './dto/search-training.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const recordInclude = {
  user: { select: { id: true, firstName: true, lastName: true, role: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  certificates: true,
};

@Injectable()
export class TrainingService {
  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  // ── Training Records ────────────────────────────────

  async createTrainingRecord(dto: CreateTrainingRecordDto, createdById: string, tenantId: string) {
    // Verify user belongs to tenant
    const membership = await this.prisma.userTenantMembership.findFirst({
      where: { userId: dto.userId, organizationId: tenantId, status: 'ACTIVE' },
    });
    if (!membership) {
      throw new BadRequestException('User is not an active member of this tenant');
    }

    const record = await this.prisma.trainingRecord.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        priority: dto.priority,
        status: dto.status,
        provider: dto.provider,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        startedDate: dto.startedDate ? new Date(dto.startedDate) : undefined,
        completedDate: dto.completedDate ? new Date(dto.completedDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        renewalPeriodMonths: dto.renewalPeriodMonths,
        hoursCompleted: dto.hoursCompleted,
        score: dto.score,
        notes: dto.notes,
        userId: dto.userId,
        createdById,
        tenantId,
      },
      include: recordInclude,
    });

    this.audit
      .log({
        userId: createdById,
        action: 'CREATE',
        resource: 'TrainingRecord',
        resourceId: record.id,
        tenantId,
        metadata: { title: dto.title, staffUserId: dto.userId },
      })
      .catch(() => {});

    return record;
  }

  async listTrainingRecords(tenantId: string, filters: SearchTrainingDto = {}) {
    const page = filters.page ?? DEFAULT_PAGE;
    const limit = filters.limit ?? DEFAULT_LIMIT;
    const skip = (page - 1) * limit;

    const where: Prisma.TrainingRecordWhereInput = { tenantId };

    if (filters.userId) where.userId = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.priority) where.priority = filters.priority;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { provider: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.trainingRecord.findMany({
        where,
        include: recordInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.trainingRecord.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getTrainingRecord(id: string, tenantId: string) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id, tenantId },
      include: recordInclude,
    });
    if (!record) throw new NotFoundException('Training record not found');
    return record;
  }

  async getMyTrainingRecords(userId: string, tenantId: string) {
    const records = await this.prisma.trainingRecord.findMany({
      where: { userId, tenantId },
      include: {
        certificates: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return records;
  }

  async updateTrainingRecord(id: string, dto: UpdateTrainingRecordDto, tenantId: string) {
    const existing = await this.prisma.trainingRecord.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Training record not found');

    const data: Prisma.TrainingRecordUpdateInput = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.provider !== undefined) data.provider = dto.provider;
    if (dto.scheduledDate !== undefined) data.scheduledDate = new Date(dto.scheduledDate);
    if (dto.startedDate !== undefined) data.startedDate = new Date(dto.startedDate);
    if (dto.completedDate !== undefined) data.completedDate = new Date(dto.completedDate);
    if (dto.expiryDate !== undefined) data.expiryDate = new Date(dto.expiryDate);
    if (dto.renewalPeriodMonths !== undefined) data.renewalPeriodMonths = dto.renewalPeriodMonths;
    if (dto.hoursCompleted !== undefined) data.hoursCompleted = dto.hoursCompleted;
    if (dto.score !== undefined) data.score = dto.score;
    if (dto.notes !== undefined) data.notes = dto.notes;

    // Auto-status logic
    if (dto.status !== undefined) {
      data.status = dto.status;
    } else if (dto.completedDate && existing.status !== TrainingStatus.COMPLETED) {
      data.status = TrainingStatus.COMPLETED;
    } else if (dto.startedDate && existing.status === TrainingStatus.SCHEDULED) {
      data.status = TrainingStatus.IN_PROGRESS;
    }

    const record = await this.prisma.trainingRecord.update({
      where: { id },
      data,
      include: recordInclude,
    });

    this.audit
      .log({
        userId: 'system',
        action: 'UPDATE',
        resource: 'TrainingRecord',
        resourceId: id,
        tenantId,
        metadata: { changes: Object.keys(dto) },
      })
      .catch(() => {});

    return record;
  }

  async deleteTrainingRecord(id: string, userId: string, tenantId: string) {
    const existing = await this.prisma.trainingRecord.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Training record not found');

    await this.prisma.trainingRecord.delete({ where: { id } });

    this.audit
      .log({
        userId,
        action: 'DELETE',
        resource: 'TrainingRecord',
        resourceId: id,
        tenantId,
        metadata: { title: existing.title },
      })
      .catch(() => {});
  }

  // ── Certificates ────────────────────────────────────

  async addCertificate(trainingRecordId: string, dto: CreateCertificateDto, tenantId: string) {
    const record = await this.prisma.trainingRecord.findFirst({
      where: { id: trainingRecordId, tenantId },
    });
    if (!record) throw new NotFoundException('Training record not found');

    return this.prisma.trainingCertificate.create({
      data: {
        name: dto.name,
        issuer: dto.issuer,
        certificateNumber: dto.certificateNumber,
        issueDate: new Date(dto.issueDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        trainingRecordId,
        tenantId,
      },
    });
  }

  async updateCertificate(
    trainingRecordId: string,
    certId: string,
    dto: UpdateCertificateDto,
    tenantId: string,
  ) {
    const cert = await this.prisma.trainingCertificate.findFirst({
      where: { id: certId, trainingRecordId, tenantId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    const data: Prisma.TrainingCertificateUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.issuer !== undefined) data.issuer = dto.issuer;
    if (dto.certificateNumber !== undefined) data.certificateNumber = dto.certificateNumber;
    if (dto.issueDate !== undefined) data.issueDate = new Date(dto.issueDate);
    if (dto.expiryDate !== undefined) data.expiryDate = new Date(dto.expiryDate);

    return this.prisma.trainingCertificate.update({
      where: { id: certId },
      data,
    });
  }

  async deleteCertificate(trainingRecordId: string, certId: string, tenantId: string) {
    const cert = await this.prisma.trainingCertificate.findFirst({
      where: { id: certId, trainingRecordId, tenantId },
    });
    if (!cert) throw new NotFoundException('Certificate not found');

    await this.prisma.trainingCertificate.delete({ where: { id: certId } });
  }

  // ── Summary & Expiring ──────────────────────────────

  async getTrainingSummary(tenantId: string) {
    const [records, expiringCount] = await Promise.all([
      this.prisma.trainingRecord.findMany({
        where: { tenantId },
        select: { status: true, category: true, priority: true },
      }),
      this.prisma.trainingRecord.count({
        where: {
          tenantId,
          expiryDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
          status: { not: TrainingStatus.EXPIRED },
        },
      }),
    ]);

    const totalRecords = records.length;
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    let mandatoryTotal = 0;
    let mandatoryCompleted = 0;

    for (const r of records) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;

      if (r.priority === 'MANDATORY') {
        mandatoryTotal++;
        if (r.status === 'COMPLETED') mandatoryCompleted++;
      }
    }

    const compliancePercentage =
      mandatoryTotal > 0 ? Math.round((mandatoryCompleted / mandatoryTotal) * 100) : 100;

    return {
      totalRecords,
      byStatus,
      byCategory,
      mandatoryTotal,
      mandatoryCompleted,
      compliancePercentage,
      expiringCount,
    };
  }

  async getExpiringTraining(tenantId: string, daysAhead = 30) {
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    return this.prisma.trainingRecord.findMany({
      where: {
        tenantId,
        expiryDate: { lte: futureDate, gte: new Date() },
        status: { not: TrainingStatus.EXPIRED },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        certificates: true,
      },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
